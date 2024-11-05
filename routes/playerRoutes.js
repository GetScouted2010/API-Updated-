const router = require("express").Router();
const Player = require("../models/player");
const verifyToken = require('../middleware/auth');

// Return all elements in the 'players' collection
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const player = await Player.find();
        return res.json(player);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching Players", error })
    }
});

// Return element in the 'players' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await Player.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
      return res.status(500).json({ message: "Error fetching Players", error })
    }
});

// Return all elements in the 'players' collection with data matching the query parameter
router.get("/find", verifyToken, async ({ query }, res, next) => {
    try{
        const player = await Player.find(query);
        return res.json(player);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching Players", error })
    } 
});

// Returns all elements in the 'players' collection that have either a Player name or Team name containing the parameter
router.get("/search", verifyToken, async ({ query }, res, next) => {
  
  // Check if 'value' field exists in the query parameter
  if (!query.value) {
    return res.status(400).json({ message: 'Value is required.' });
  }

  try{
      const tRegex = new RegExp(`\\b${query.value}`, 'i'); // Match beginning of any word in team field

      // Search for players by name, only returning fields 'Player', 'Team', and 'Position'
      const nameMatches = await Player.find({
        $or: [
          { Player: { $regex: `^${query.value}`, $options: 'i' } }, // Match for beginning of First name
          { Player: { $regex: `\\s${query.value}`, $options: 'i' } } // Match for beginning of Last name
        ]
      }).select('Player Team Position -_id');

      // Search for Teams by name (pulled from players collection)
      const teamMatches = await Player.find({
        Team: { $regex: tRegex }
      }).select('Team -_id');

      // Remove duplicate team results as these values are pulled from the players collection
      const uniqueTeams = Array.from(new Map(teamMatches.map(Player => [Player.Team, Player])).values());

      // Compile and map results to Players and Teams objects for easier readability on frontend
      const result = {
        Players: nameMatches,
        Teams: uniqueTeams
      };

      res.json(result);
  } catch (error) {
      return res.status(500).json({ message: "Error fetching Players", error })
  } 
});

// GET route for advanced querying (Player filtering with dynamic ranges)
router.get('/filter', verifyToken, async (req, res) => {
    try {
      const query = {};
  
      // Parse the request query parameters
      for (const [key, value] of Object.entries(req.query)) {
        // Split field and operator if it exists (e.g., "price__gte" => ["price", "gte"])
        const [field, operator] = key.split('__');
  
        if (operator === 'gte' || operator === 'lte') {
          // Handle range queries
          if (!query[field]) {
            query[field] = {};
          }
          query[field][`$${operator}`] = Number(value);
        } else {
          // Handle exact matches (treat as string or number based on field's expected type)
          query[field] = isNaN(value) ? value : Number(value);
        }
      }
  
      // Fetch items from MongoDB based on the dynamic query
      const items = await Player.find(query);
      res.json(items);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching items' });
    }
  });

module.exports = router;