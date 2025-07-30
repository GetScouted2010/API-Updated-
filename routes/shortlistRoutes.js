const router = require("express").Router();

const verifyToken = require('../middleware/auth');
const Shortlist = require("../models/shortlist");

const Player = require("../models/player");
const Compatibility_Score = require("../models/compatibilityScores");
const { getTransferAverages } = require('./transferRoutes');

const {
  getOriginalFieldName,
  getSanitizedFieldName
} = require('../utils/fieldMapper');

// Route to get all lists created by the currently logged in user
router.get("/getLists", verifyToken, async (req, res, next) => {
  try {
    // const team = req.user.team;
    const userId = req.user.id;
    const found = await Shortlist.find({ user_id: userId }).lean();

    // Add shortlistLength to each document
    const modifiedResponse = found.map(item => ({
      ...item,
      shortlistLength: item.shortlist ? item.shortlist.length : 0
    }));

    // Commented out for now - .populate functionality (not needed for get all lists(?))
    // Will need slight modification if being included again for this route

    // for (const doc of found) {
    //   // Populate the shortlist with player details
    //   const players = await Player.find({ UniqueID: { $in: doc.shortlist } });
    //   doc.shortlist = [];

    //   for (const player of players) {
    //     // Fetch the Compatibility_Score for this player and the specified team
    //     const compatibilityRecord = await Compatibility_Score.findOne({
    //       UniqueID: player.UniqueID
    //     });

    //     const compatibilityScore = compatibilityRecord?.[team] || null;

    //     // Add the Compatibility_Score field to the player object
    //     doc.shortlist.push({
    //       ...player.toObject(),
    //       Compatibility_Score: compatibilityScore
    //     });
    //   }
    // }

    return res.json(modifiedResponse);
  } catch (error) {
    return res.status(400).json({ message: "Error fetching Shortlists", error })
  }
});

// Route to get all lists created by the currently logged in user
router.get("/getList/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const listId = req.params.id;

    const found = await Shortlist.findOne({ user_id: userId, _id: listId }).lean();

    if (!found) {
      return res.status(404).json({ message: 'List not found' });
    }

    const shortlist = found.shortlist || [];

    // Step 1: Extract playerIds and create a map from playerId to team
    const playerTeamMap = new Map();
    for (const entry of shortlist) {
      playerTeamMap.set(entry.playerId, entry.team);
    }

    const playerIds = [...playerTeamMap.keys()];

    // Step 2: Batch-fetch players and compatibility scores
    const players = await Player.find({ UniqueID: { $in: playerIds } }).lean();
    const compatScores = await Compatibility_Score.find({ UniqueID: { $in: playerIds } }).lean();

    // Create maps for fast lookup
    const playerMap = new Map(players.map(p => [p.UniqueID, p]));
    const scoreMap = new Map(compatScores.map(s => [s.UniqueID, s]));

    // Step 3: Build enriched shortlist
    const enrichedShortlist = [];

    for (const playerId of playerIds) {
      const player = playerMap.get(playerId);
      const team = playerTeamMap.get(playerId);
      const scoreDoc = scoreMap.get(playerId);

      if (!player) continue;

      // Compatibility Score per player's assigned team
      const compatibilityScore = scoreDoc?.[team] ?? null;

      // Financial Fit
      let financial_Fit = 'Poor';
      try {
        const transferAverages = await getTransferAverages(team, null, player.Position);

        if (
          player.Age >= transferAverages.Great_Fit.ageMin &&
          player.Age <= transferAverages.Great_Fit.ageMax &&
          player.Market_value >= (transferAverages.Great_Fit.marketValueMin * 1000000) &&
          player.Market_value <= (transferAverages.Great_Fit.marketValueMax * 1000000)
        ) {
          financial_Fit = 'Great';
        } else if (
          player.Age >= transferAverages.Moderate_Fit.ageMin &&
          player.Age <= transferAverages.Moderate_Fit.ageMax &&
          player.Market_value >= (transferAverages.Moderate_Fit.marketValueMin * 1000000) &&
          player.Market_value <= (transferAverages.Moderate_Fit.marketValueMax * 1000000)
        ) {
          financial_Fit = 'Moderate';
        }
      } catch (e) {
        console.warn(`Could not fetch transfer averages for ${team} - ${player.Position}`, e);
      }

      enrichedShortlist.push({
        ...player,
        Compatibility_Team: getSanitizedFieldName(team), // include the team this player was added with
        Compatibility_Score: compatibilityScore,
        Financial_Fit: financial_Fit
      });
    }

    // Attach enriched list back to the doc
    found.shortlist = enrichedShortlist;

    return res.json(found);
  } catch (error) {
    console.error('Error fetching shortlist:', error);
    return res.status(400).json({ message: "Error fetching shortlist", error });
  }
});


// Route to create a new list
router.post('/createList', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const name = req.body.listName;

  // Validate for list name
  if (!name) {
    return res.status(400).json({ error: 'listName is required' });
  }
  try {
    // Create new shortlist
    const newList = new Shortlist({
      user_id: userId, // Convert user ID to ObjectID
      listName: name,
      shortlist: [] // Initialize as an empty array
    });

    // Save the new shortlist to the database
    await newList.save();

    // Return success response with the created shortlist
    res.status(201).json({
      message: 'Shortlist created successfully',
      record: newList
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to add a player to the shortlist
router.post('/addToList', verifyToken, async (req, res) => {
  const { listId, playerId, team } = req.body;

  // Validate inputs
  if (!listId || !playerId || !team) {
    return res.status(400).json({ error: 'listId, playerId and team are required' });
  }

  let sanitizedTeam = getSanitizedFieldName(team);

  try {
    // Update the record by pushing the playerId to the shortlist array
    const updatedRecord = await Shortlist.findByIdAndUpdate(
      listId,
      { $push: { shortlist: { playerId, sanitizedTeam } } },
      { new: true } // Return the updated document
    );

    // Check if the shortlist was found and updated
    if (!updatedRecord) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }

    // Return success response with the updated shortlist
    res.status(200).json({
      message: 'Player added to shortlist successfully',
      record: updatedRecord
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to remove a player from a shortlist
router.post('/removeFromList', verifyToken, async (req, res) => {
  const { listId, playerId, team } = req.body;

  // Validate inputs
  if (!listId || !playerId || !team) {
    return res.status(400).json({ error: 'listId, playerId and team are required' });
  }

  let originalTeam = getOriginalFieldName(team);

  try {

    // Update the record by removing the playerId from the shortlist array
    const updatedRecord = await Shortlist.findByIdAndUpdate(
      listId,
      { $pull: { shortlist: { playerId, originalTeam } } }, // Remove objectId from shortlist array
      { new: true } // Return the updated document
    );

    // Check if the shortlist was found and updated
    if (!updatedRecord) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }

    // Return success response with the updated record
    res.status(200).json({
      message: 'playerId removed from shortlist successfully',
      record: updatedRecord
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a shortlist
router.post('/deleteList', verifyToken, async (req, res) => {
  const { listId } = req.body;

  // Validate input
  if (!listId) {
    return res.status(400).json({ error: 'listId is required' });
  }

  try {
    // Find and delete the record
    const deletedRecord = await Shortlist.findByIdAndDelete(listId);

    // Check if the record was found and deleted
    if (!deletedRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Return success response
    res.status(200).json({
      message: 'Record deleted successfully',
      record: deletedRecord
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to Search for players inside a specified shortlist
router.get('/searchList', verifyToken, async (req, res) => {
  const { listId, playerName } = req.query;

  if (!listId) {
    return res.status(400).json({ error: 'listId query parameter is required' });
  }

  if (!playerName) {
    return res.status(400).json({ error: 'playerName query parameter is required' });
  }

  try {
    const regex = new RegExp(`\\b${playerName}`, 'i');

    // Fetch shortlist
    const shortlistDoc = await Shortlist.findById(listId).lean();

    if (!shortlistDoc) {
      return res.status(404).json({ error: 'List not found' });
    }

    const shortlist = shortlistDoc.shortlist || [];

    // Build playerId → team map
    const playerTeamMap = new Map();
    for (const entry of shortlist) {
      playerTeamMap.set(entry.playerId, entry.team);
    }

    const playerIds = [...playerTeamMap.keys()];

    // Find players matching name in shortlist
    const players = await Player.find({
      UniqueID: { $in: playerIds },
      Player: { $regex: regex }
    }).lean();

    if (!players.length) {
      return res.json({ listId: shortlistDoc._id, players: [] });
    }

    // Fetch Compatibility_Score for matching players
    const compatScores = await Compatibility_Score.find({
      UniqueID: { $in: players.map(p => p.UniqueID) }
    }).lean();

    const compatMap = new Map(compatScores.map(score => [score.UniqueID, score]));

    // Build result set
    const enhancedPlayers = await Promise.all(players.map(async player => {
      const team = playerTeamMap.get(player.UniqueID);
      const scoreDoc = compatMap.get(player.UniqueID);
      const compatibilityScore = scoreDoc?.[team] ?? null;
      const sanitizedTeam = getSanitizedFieldName(team);

      let financial_Fit = 'Poor';
      try {
        const externalData = await getTransferAverages(team, null, player.Position);

        if (
          player.Age >= externalData.Great_Fit.ageMin &&
          player.Age <= externalData.Great_Fit.ageMax &&
          player.Market_value >= (externalData.Great_Fit.marketValueMin * 1000000) &&
          player.Market_value <= (externalData.Great_Fit.marketValueMax * 1000000)
        ) {
          financial_Fit = 'Great';
        } else if (
          player.Age >= externalData.Moderate_Fit.ageMin &&
          player.Age <= externalData.Moderate_Fit.ageMax &&
          player.Market_value >= (externalData.Moderate_Fit.marketValueMin * 1000000) &&
          player.Market_value <= (externalData.Moderate_Fit.marketValueMax * 1000000)
        ) {
          financial_Fit = 'Moderate';
        }
      } catch (e) {
        console.warn(`Failed to get financial fit for ${player.Player} / ${team}`, e);
      }

      return {
        ...player,
        Compatibility_Team: sanitizedTeam,
        Compatibility_Score: compatibilityScore,
        Financial_Fit: financial_Fit
      };
    }));

    res.json({
      listId: shortlistDoc._id,
      players: enhancedPlayers
    });
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;