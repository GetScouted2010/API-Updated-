const router = require("express").Router();
const Player = require("../models/player");
const verifyToken = require('../middleware/auth');

const AM = require("../models/AM");
const CB = require("../models/CB");
const CM = require("../models/CM");
const DM = require("../models/DM");
const FWD = require("../models/FWD");
const LB = require("../models/LB");
const LW = require("../models/LW");
const RB = require("../models/RB");
const RW = require("../models/RW");

const CompatibilityScores = require("../models/compatibilityScores");
const Playstyles = require('../models/playstyles');

const models = { AM, CB, CM, DM, FWD, LB, LW, RB, RW };

const fs = require('fs');
const path = require('path');

// Load the field mapping
const mappingFilePath = path.join(__dirname, '../cs_field_mapping.json');
let fieldMapping;

try {
  fieldMapping = JSON.parse(fs.readFileSync(mappingFilePath, 'utf-8'));
  console.log('Field mapping loaded.');
} catch (error) {
  console.error('Error loading cs_field_mapping.json:', error.message);
}

// Helper functions to use the mapping
function getOriginalFieldName(sanitizedFieldName) {
  for (const [original, sanitized] of Object.entries(fieldMapping)) {
    if (sanitized === sanitizedFieldName) {
      return original;
    }
  }
  return sanitizedFieldName; // Return as-is if no match found
}

function getSanitizedFieldName(originalFieldName) {
  return fieldMapping[originalFieldName] || originalFieldName;
}

// Function to calculate percentage difference between two specified values
function calculateSignedPercentageDifference(value1, value2) {
  if (value1 === 0 && value2 === 0) return 0; // Avoid division by zero
  const difference = ((value2 - value1) / ((value1 + value2) / 2)) * 100;
  return difference.toFixed(2); // Returns a positive or negative value
}

// Function to get maximum values of each field in the Player schema
const getMaxValues = async (...positions) => {
  try {
    // Ensure more than one position is provided
    if (positions.length === 0) {
      throw new Error('You must provide 1 or more positions');
    }

    // Step 1: Extract numeric fields from the schema
    const schemaPaths = Player.schema.paths;
    const numericFields = Object.keys(schemaPaths).filter(field => {
      const fieldType = schemaPaths[field].instance;
      return fieldType === 'Number'; // Only include numeric fields
    });

    // Step 2: Build the $group stage dynamically
    const groupStage = numericFields.reduce((acc, field) => {
      acc[field] = { $max: `$${field}` }; // Keep the original field names
      return acc;
    }, { _id: null });

    // Step 3: Perform the aggregation with a $match stage
    const result = await Player.aggregate([
      { $match: { Position: { $in: positions } } }, // Filter by one or more positions
      { $group: groupStage },                      // Compute the max values
      { $project: { _id: 0 } }                     // Exclude the _id field
    ]);

    return result[0] || {}; // Return the result or an empty object
  } catch (err) {
    console.error('Error computing max values:', err);
    throw new Error('Failed to compute max values');
  }
};

// Return all elements in the 'players' collection
router.get("/getAll", verifyToken, async (req, res, next) => {
  try {
    const player = await Player.find();
    return res.json(player);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// Return element in the 'players' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({ params: { id }, user }, res, next) => {
  try {
    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: `No Player with the ID: ${id}` });

    // Fetch Compatibility Score based on the logged in user's team
    const team = user.team;
    const additionalData = await CompatibilityScores.findOne({ UniqueID: id }).lean();
    const score = additionalData ? additionalData[team] : null;

    const transformedResult = {
      _id: found._id,
      UniqueID: found.UniqueID,
      Compatibility_Score: score,
      Player: found.Player,
      League: found.League,
      Season: found.Season,
      Team: found.Team,
      Team_within_selected_timeframe: found.Team_within_selected_timeframe,
      Birth_country: found.Birth_country,
      Passport_country: found.Passport_country,
      On_loan: found.On_loan,
      Main_Position: found.Main_Position,
      Position: found.Position,
      Total_Score: found.Total_Score,
      Age: found.Age,
      Foot: found.Foot,
      Height: found.Height,
      Weight: found.Weight,
      Market_value: found.Market_value,
      // Short_Market_Value: found.Short_Market_Value,
      Contract_expires: found.Contract_expires,
      Minutes_played: found.Minutes_played,
      Matches_played: found.Matches_played,
      Yellow_cards: found.Yellow_cards,
      Red_cards: found.Red_cards,
      Offensive: {
        Goals: found.Goals,
        Non_penalty_goals: found.Non_penalty_goals,
        Goals_per_90: found.Goals_per_90,
        Non_penalty_goals_per_90: found.Non_penalty_goals_per_90,
        xG: found.xG,
        xG_per_90: found.xG_per_90,
        Head_goals: found.Head_goals,
        Head_goals_per_90: found.Head_goals_per_90,
        Shots: found.Shots,
        Shots_per_90: found.Shots_per_90,
        Shots_on_target_percentage: found.Shots_on_target_percentage,
        Goal_conversion_percentage: found.Goal_conversion_percentage,
        Free_kicks_per_90: found.Free_kicks_per_90,
        Direct_free_kicks_per_90: found.Direct_free_kicks_per_90,
        Direct_free_kicks_on_target_percentage: found.Direct_free_kicks_on_target_percentage,
        Corners_per_90: found.Corners_per_90,
        Penalties_taken: found.Penalties_taken,
        Penalty_conversion_percentage: found.Penalty_conversion_percentage,
        Successful_attacking_actions_per_90: found.Successful_attacking_actions_per_90,
        Offensive_duels_per_90: found.Offensive_duels_per_90,
        Offensive_duels_won_percentage: found.Offensive_duels_won_percentage,
        Crosses_per_90: found.Crosses_per_90,
        Accurate_crosses_percentage: found.Accurate_crosses_percentage,
        Crosses_from_left_flank_per_90: found.Crosses_from_left_flank_per_90,
        Accurate_crosses_from_left_flank_percentage: found.Accurate_crosses_from_left_flank_percentage,
        Crosses_from_right_flank_per_90: found.Crosses_from_right_flank_per_90,
        Accurate_crosses_from_right_flank_percentage: found.Accurate_crosses_from_right_flank_percentage,
        Crosses_to_goalie_box_per_90: found.Crosses_to_goalie_box_per_90,
        Touches_in_box_per_90: found.Touches_in_box_per_90,
        Dribbles_per_90: found.Dribbles_per_90,
        Successful_dribbles_percentage: found.Successful_dribbles_percentage,
        Accelerations_per_90: found.Accelerations_per_90,
      },
      Defensive: {
        Successful_defensive_actions_per_90: found.Successful_defensive_actions_per_90,
        Defensive_duels_per_90: found.Defensive_duels_per_90,
        Defensive_duels_won_percentage: found.Defensive_duels_won_percentage,
        Aerial_duels_per_90: found.Aerial_duels_per_90,
        Aerial_duels_won_percentage: found.Aerial_duels_won_percentage,
        Interceptions_per_90: found.Interceptions_per_90,
        PAdj_Interceptions: found.PAdj_Interceptions,
        PAdj_Sliding_tackles: found.PAdj_Sliding_tackles,
        Shots_blocked_per_90: found.Shots_blocked_per_90,
        Fouls_per_90: found.Fouls_per_90
      },
      Passing: {
        Passes_per_90: found.Passes_per_90,
        Accurate_passes_percentage: found.Accurate_passes_percentage,
        Average_pass_length_m: found.Average_pass_length_m,
        Average_long_pass_length_m: found.Average_long_pass_length_m,
        Short_medium_passes_per_90: found.Short_medium_passes_per_90,
        Accurate_short_medium_passes_percentage: found.Accurate_short_medium_passes_percentage,
        Forward_passes_per_90: found.Forward_passes_per_90,
        Accurate_forward_passes_percentage: found.Accurate_forward_passes_percentage,
        Progressive_passes_per_90: found.Progressive_passes_per_90,
        Accurate_progressive_passes_percentage: found.Accurate_progressive_passes_percentage,
        Back_passes_per_90: found.Back_passes_per_90,
        Accurate_back_passes_percentage: found.Accurate_back_passes_percentage,
        Lateral_passes_per_90: found.Lateral_passes_per_90,
        Accurate_lateral_passes_percentage: found.Accurate_lateral_passes_percentage,
        Assists: found.Assists,
        Assists_per_90: found.Assists_per_90,
        Shot_assists_per_90: found.Shot_assists_per_90,
        Second_assists_per_90: found.Second_assists_per_90,
        Third_assists_per_90: found.Third_assists_per_90,
        Passes_to_final_third_per_90: found.Passes_to_final_third_per_90,
        Accurate_passes_to_final_third_percentage: found.Accurate_passes_to_final_third_percentage,
        Long_passes_per_90: found.Long_passes_per_90,
        Accurate_long_passes_percentage: found.Accurate_long_passes_percentage,
        Smart_passes_per_90: found.Smart_passes_per_90,
        Accurate_smart_passes_percentage: found.Accurate_smart_passes_percentage,
        Through_passes_per_90: found.Through_passes_per_90,
        Accurate_through_passes_percentage: found.Accurate_through_passes_percentage,
        Deep_completions_per_90: found.Deep_completions_per_90,
        Deep_completed_crosses_per_90: found.Deep_completed_crosses_per_90,
      },
      Duels: {
        Offensive_duels_per_90: found.Offensive_duels_per_90,
        Offensive_duels_won_percentage: found.Offensive_duels_won_percentage,
        Defensive_duels_per_90: found.Defensive_duels_per_90,
        Defensive_duels_won_percentage: found.Defensive_duels_won_percentage,
        Aerial_duels_per_90: found.Aerial_duels_per_90,
        Aerial_duels_won_percentage: found.Aerial_duels_won_percentage,
      },
      Goalkeeping: {
        Clean_sheets: found.Clean_sheets,
        Conceded_goals: found.Conceded_goals,
        Conceded_goals_per_90: found.Conceded_goals_per_90,
        Shots_against: found.Shots_against,
        Shots_against_per_90: found.Shots_against_per_90,
        Save_rate_percentage: found.Save_rate_percentage,
        Prevented_goals: found.Prevented_goals,
        Prevented_goals_per_90: found.Prevented_goals_per_90,
        Exits_per_90: found.Exits_per_90,
        Aerial_duels_per_90: found.Aerial_duels_per_90,
        Interceptions_per_90: found.Interceptions_per_90,
        Back_passes_received_as_GK_per_90: found.Back_passes_received_as_GK_per_90,
      }
    }
    return res.json(transformedResult);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// Return all elements in the 'players' collection with data matching the query parameter
router.get("/find", verifyToken, async ({ query }, res, next) => {
  try {
    const player = await Player.find(query);
    return res.json(player);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// Returns all elements in the 'players' collection that have either a Player name or Team name containing the parameter
router.get("/search", verifyToken, async (req, res, next) => {
  const { value } = req.query;
  // Check if 'value' field exists in the query parameter
  if (!value) {
    return res.status(400).json({ message: 'value is required.' });
  }
  try {
    const team = req.user.team; // Fetch logged in users team
    const tRegex = new RegExp(`\\b${value}`, 'i'); // Match beginning of any word in team field

    // Search for players by name, only returning fields 'Player', 'Team', and 'Position'
    const nameMatches = await Player.find({
      $or: [
        { Player: { $regex: `^${value}`, $options: 'i' }, Season: "Last Calendar Year" }, // Match for beginning of First name
        { Player: { $regex: `\\s${value}`, $options: 'i' }, Season: "Last Calendar Year" } // Match for beginning of Last name
      ]
    }).select('UniqueID Player Team Position Season -_id')
      .sort({ UniqueID: 1 })
      .limit(30)
      .lean();

    // Remove duplicates based on Player, Team, and Position
    const uniquePlayers = [];
    const seen = new Map();

    if (nameMatches.length != 0) {
      for (const player of nameMatches) {
        const key = `${player.Player}-${player.Team}-${player.Position}`;
        if (!seen.has(key)) {
          seen.set(key, true);
          uniquePlayers.push(player);
        }
      }
    }

    // Fetch additional field dynamically based on Team and append it to the result
    const nameMatchesScore = await Promise.all(
      uniquePlayers.map((player) => {
        return CompatibilityScores.findOne({ UniqueID: player.UniqueID })
          .lean() // Use lean() for better performance
          .then((additionalData) => {
            // Dynamically extract the field matching the Team value
            const score = additionalData ? additionalData[team] : null;

            return {
              ...player,
              Compatibility_Score: score, // Label the field as 'Compatibility_Score'
            };
          })
          .catch((err) => {
            // Handle errors in fetching additional data for each player
            console.error(`Error fetching additional data for player ${player.UniqueID}:`, err);
            return { ...player, Score: null }; // Gracefully handle errors
          });
      })
    );


    // Search for Teams by name (pulled from Playstyles collection) - Return 'UniqueID' and 'Team'
    const teamMatches = await Playstyles.find({
      Team: { $regex: tRegex }
    }).select('UniqueID Team -_id')
      .sort({ UniqueID: 1 })
      .limit(5);

    // Compile and map results to Players and Teams objects for easier readability on frontend
    const result = {
      Players: nameMatchesScore,
      Teams: teamMatches
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

// Filter route against Compatibility Score - Paginated
router.get('/csfilter', verifyToken, async (req, res) => {
  const { season, league, minRating, maxRating, minScore, maxScore, minAge, maxAge, minMarketValue, maxMarketValue, selectTeam, selectPosition, page = 1, limit = 10 } = req.query;
  let { role, team } = req.query;

  // Parse rating and other filters as floats, if provided
  const minRatingValue = minRating ? parseFloat(minRating) : null;
  const maxRatingValue = maxRating ? parseFloat(maxRating) : null;
  const minScoreValue = minScore ? parseFloat(minScore) : null;
  const maxScoreValue = maxScore ? parseFloat(maxScore) : null;
  const minAgeValue = minAge ? parseFloat(minAge) : null;
  const maxAgeValue = maxAge ? parseFloat(maxAge) : null;
  const minMarketValueValue = minMarketValue ? parseFloat(minMarketValue) : null;
  const maxMarketValueValue = maxMarketValue ? parseFloat(maxMarketValue) : null;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  try {
    let dynamicFilter = null;

    // Normalize `League` into an array
    let leagueArray = [];
    if (league) {
      leagueArray = Array.isArray(league) ? league : league.split(',');
    }

    // Normalize `Season` into an array
    let seasonArray = [];
    if (season) {
      seasonArray = Array.isArray(season) ? season : season.split(',');
    }

    if (team) {
      team = getSanitizedFieldName(team);
    }

    // Check `selectPosition` and validate the `role` in the dynamic collection
    if (selectPosition && role) {
      const DynamicModel = models[selectPosition];

      if (!DynamicModel) {
        return res.status(400).json({ error: `Invalid selectPosition value: ${selectPosition}` });
      }

      // Split roles by comma and ensure it is an array with up to 2 items
      const rolesArray = role
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
        .map((role) => role.replace(/\s+/g, '_')); // Replace spaces with underscores

      if (rolesArray.length === 0 || rolesArray.length > 2) {
        return res
          .status(400)
          .json({ error: "Please specify up to 2 roles, separated by commas." });
      }

      const dynamicResults = await DynamicModel.aggregate([
        {
          $addFields: {
            roleValues: {
              $map: {
                input: rolesArray, // Array of roles
                as: "role",
                in: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: { $objectToArray: "$$ROOT" },
                                as: "field",
                                cond: { $eq: ["$$field.k", "$$role"] }
                              }
                            },
                            as: "filteredField",
                            in: "$$filteredField.v"
                          }
                        },
                        0
                      ]
                    },
                    0 // Default value if field is missing
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            combinedFields: {
              $map: {
                input: {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $objectToArray: "$$ROOT" },
                        cond: {
                          $and: [
                            { $ne: ["$$this.k", "_id"] },
                            { $ne: ["$$this.k", "UniqueID"] }
                          ]
                        }
                      }
                    },
                    rolesArray.map((role, index) => ({
                      k: role,
                      v: { $arrayElemAt: ["$roleValues", index] }
                    }))
                  ]
                },
                as: "field",
                in: {
                  k: "$$field.k",
                  v: "$$field.v"
                }
              }
            }
          }
        },
        {
          $project: {
            UniqueID: 1,
            roleValues: 1,
            roundedRoleValues: {
              $map: {
                input: "$roleValues",
                as: "value",
                in: {
                  $cond: {
                    if: { $and: [{ $isNumber: "$$value" }, { $ne: ["$$value", null] }] },
                    then: { $round: [{ $toDouble: "$$value" }, 2] },
                    else: null
                  }
                }
              }
            },
            sortedFields: {
              $slice: [
                {
                  $sortArray: {
                    input: {
                      $map: {
                        input: "$combinedFields",
                        as: "field",
                        in: {
                          k: "$$field.k",
                          v: {
                            $cond: {
                              if: { $and: [{ $isNumber: "$$field.v" }, { $ne: ["$$field.v", null] }] },
                              then: { $round: [{ $toDouble: "$$field.v" }, 2] },
                              else: null
                            }
                          }
                        }
                      }
                    },
                    sortBy: { v: -1 }
                  }
                },
                2
              ]
            }
          }
        },
        {
          $project: {
            UniqueID: 1,
            roleValues: 1,
            roundedRoleValues: 1,
            sortedFields: 1,
            sortedValues: {
              $map: {
                input: "$sortedFields",
                as: "field",
                in: { $round: [{ $toDouble: "$$field.v" }, 2] }
              }
            },
            matchDirectly: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$sortedFields",
                      as: "field",
                      cond: {
                        $in: [
                          { $round: [{ $toDouble: "$$field.v" }, 2] },
                          {
                            $map: {
                              input: "$roleValues",
                              as: "value",
                              in: { $round: [{ $toDouble: "$$value" }, 2] }
                            }
                          }
                        ]
                      }
                    }
                  }
                },
                0
              ]
            }
          }
        }
      ]);

      const validUniqueIDs = dynamicResults.length > 0 ? dynamicResults.map((doc) => {
        if (doc.matchDirectly == true) {
          return doc.UniqueID;
        }
      }) : [];

      if (validUniqueIDs.length > 0) {
        dynamicFilter = { UniqueID: { $in: validUniqueIDs } };
      }

    }

    // Base pipeline for CSFilter
    const basePipeline = [
      // Step 1: Lookup the compatibilityscores collection to get matching ratings by UniqueID
      {
        $lookup: {
          from: 'compatibilityscores',
          localField: 'UniqueID',
          foreignField: 'UniqueID',
          as: 'cscore',
        },
      },

      // Step 2: Flatten the cscore array (since we expect one matching rating document per user)
      {
        $unwind: {
          path: "$cscore",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 3: Conditionally add the specified team's rating to the document (if it exists)
      ...(team && minRatingValue !== null && maxRatingValue !== null ? [
        {
          $addFields: {
            Compatibility_Score: `$cscore.${team}`,
          },
        },
        {
          $match: {
            Compatibility_Score: { $gte: minRatingValue, $lte: maxRatingValue },
          },
        }
      ] : []),


      // Step 4: Apply filters
      {
        $match: {
          ...(dynamicFilter && dynamicFilter),                  // Filter by dynamic UniqueIDs if role and position was specified
          ...(leagueArray.length && { League: { $in: leagueArray } }),                    // Filter by League if specified
          ...(seasonArray.length && { Season: { $in: seasonArray } }),                    // Filter by Season if specified
          ...(selectTeam && { Team: selectTeam }),               // Filter by Team if specified
          ...(selectPosition && { Position: selectPosition }),   // Filter by Position if specified
          ...(minScoreValue !== null && { Total_Score: { $gte: minScoreValue } }),
          ...(maxScoreValue !== null && { Total_Score: { $lte: maxScoreValue } }),
          ...(minAgeValue !== null && { Age: { $gte: minAgeValue } }),
          ...(maxAgeValue !== null && { Age: { $lte: maxAgeValue } }),
          ...(minMarketValueValue !== null && { Market_value: { $gte: minMarketValueValue } }),
          ...(maxMarketValueValue !== null && { Market_value: { $lte: maxMarketValueValue } }),
        },
      },
    ];

    // Step 5: Count total number of filtered records
    const totalRecordsResult = await Player.aggregate([
      ...basePipeline,
      { $count: "totalRecords" }
    ]);
    const totalRecords = totalRecordsResult.length > 0 ? totalRecordsResult[0].totalRecords : 0;
    const totalPages = Math.ceil(totalRecords / limitNumber);

    // Step 6: Add pagination stages
    const paginatedPipeline = [
      ...basePipeline,
      { $skip: (pageNumber - 1) * limitNumber },
      { $limit: limitNumber },
      {
        $project: {
          _id: 1,
          UniqueID: 1,
          Player: 1,
          Team: 1,
          Team_within_selected_timeframe: 1,
          League: 1,
          Season: 1,
          Main_Position: 1,
          Position: 1,
          Compatibility_Score: 1,
          Total_Score: 1,
          Age: 1,
          Market_value: 1,
          Minutes_played: 1,
          Matches_played: 1,
          Contract_expires: 1,
          Goals: 1,
          Assists: 1,
          Foot: 1
        },
      },
      {
        $sort: { Compatibility_Score: -1 }
      }
    ];

    // Step 7: Execute pagination query
    const playersWithFilteredRatings = await Player.aggregate(paginatedPipeline);

    // Step 8: Construct response with pagination metadata
    const response = {
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: pageNumber,
        pageSize: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      data: playersWithFilteredRatings,
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to pull overall graph data for specified player
router.get("/get/:id/graph/overall", verifyToken, async (req, res, next) => {
  const { id } = req.params;
  let { csteam, season } = req.query;

  let originalCsteam;
  if (csteam) {
    originalCsteam = csteam;
    csteam = getSanitizedFieldName(csteam)
  }

  // $group pipeline variable for non-GK
  const avgGroup = {
    _id: null, // Grouping by null to aggregate across all matching documents
    Goals_per_90: { $avg: '$Goals_per_90' },
    xG_per_90: { $avg: '$xG_per_90' },
    Shots_per_90: { $avg: '$Shots_per_90' },
    Assists_per_90: { $avg: '$Assists_per_90' },
    Dribbles_per_90: { $avg: '$Dribbles_per_90' },
    Successful_dribbles_percentage: { $avg: '$Successful_dribbles_percentage' },
    Key_passes_per_90: { $avg: '$Key_passes_per_90' },
    Progressive_runs_per_90: { $avg: '$Progressive_runs_per_90' },
    Shots_on_target_percentage: { $avg: '$Shots_on_target_percentage' },
    Non_penalty_goals_per_90: { $avg: '$Non_penalty_goals_per_90' },

    Defensive_duels_per_90: { $avg: '$Defensive_duels_per_90' },
    Defensive_duels_won_percentage: { $avg: '$Defensive_duels_won_percentage' },
    Interceptions_per_90: { $avg: '$Interceptions_per_90' },
    Successful_defensive_actions_per_90: { $avg: '$Successful_defensive_actions_per_90' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' },
    Fouls_per_90: { $avg: '$Fouls_per_90' },
    Sliding_tackles_per_90: { $avg: '$Sliding_tackles_per_90' },
    PAdj_Sliding_tackles: { $avg: '$PAdj_Sliding_tackles' },
    Shots_blocked_per_90: { $avg: '$Shots_blocked_per_90' },

    Accurate_passes_percentage: { $avg: '$Accurate_passes_percentage' },
    Passes_per_90: { $avg: '$Passes_per_90' },
    Progressive_passes_per_90: { $avg: '$Progressive_passes_per_90' },
    Key_passes_per_90: { $avg: '$Key_passes_per_90' },
    Passes_to_final_third_per_90: { $avg: '$Passes_to_final_third_per_90' },
    Smart_passes_per_90: { $avg: '$Smart_passes_per_90' },
    Through_passes_per_90: { $avg: '$Through_passes_per_90' },
    Passes_to_penalty_area_per_90: { $avg: '$Passes_to_penalty_area_per_90' },
    Accurate_passes_to_final_third_percentage: { $avg: '$Accurate_passes_to_final_third_percentage' },
    Accurate_through_passes_percentage: { $avg: '$Accurate_through_passes_percentage' },

    Offensive_duels_per_90: { $avg: '$Offensive_duels_per_90' },
    Offensive_duels_won_percentage: { $avg: '$Offensive_duels_won_percentage' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' }
  };

  // $group pipeline variable for GK
  const gkAvgGroup = {
    _id: null, // Grouping by null to aggregate across all matching documents
    Accurate_passes_percentage: { $avg: '$Accurate_passes_percentage' },
    Passes_per_90: { $avg: '$Passes_per_90' },
    Progressive_passes_per_90: { $avg: '$Progressive_passes_per_90' },

    Save_rate_percentage: { $avg: '$Save_rate_percentage' },
    Conceded_goals_per_90: { $avg: '$Conceded_goals_per_90' },
    Shots_against_per_90: { $avg: '$Shots_against_per_90' },
    Clean_sheets: { $avg: '$Clean_sheets' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' },

    Accurate_passes_percentage: { $avg: '$Accurate_passes_percentage' },
    Passes_to_final_third_per_90: { $avg: '$Passes_to_final_third_per_90' },
    Progressive_passes_per_90: { $avg: '$Progressive_passes_per_90' },

    Duels_per_90: { $avg: '$Duels_per_90' },
    Duels_won_percentage: { $avg: '$Duels_won_percentage' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' }
  }

  try {

    let found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: `No Player with the ID: ${id}` });

    // If season parameter was provided, find matching player profile
    let seasonFound;
    if (season) seasonFound = await Player.findOne({ Player: found.Player, Team: found.Team, Age: found.Age, Birth_country: found.Birth_country, Passport_country: found.Passport_country, Age: found.Age, Season: season });

    if (seasonFound) {
      found = seasonFound;
    }
    if (season && !seasonFound) {
      return next({ status: 404, message: `No Season Data for Player: ${found.Player} and Season: ${season}` });
    }

    // Fetch max values for specified role
    const maxValues = await getMaxValues(found.Position);

    // Fetch Compatibility Score
    let csValue = null
    if (csteam) {
      const findScore = await CompatibilityScores.findOne({ UniqueID: found.UniqueID });
      if (!findScore) {
        csValue = null
      }
      else {
        csValue = findScore[csteam]
        if (csValue === undefined) {
          csValue = null;
        }
      }
    }

    let finalData = null;
    // If the player is not a Goalkeeper
    if (found.Position !== "GK") {

      // --------------- Team Average Calculation
      const averagesResult = await Player.aggregate([
        {
          $match: { Team_within_selected_timeframe: found.Team_within_selected_timeframe, Position: found.Position } // Filter documents where Team and position matches from the initial found player
        },
        {
          $group: avgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const averages = averagesResult.length > 0 ? averagesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const roundedAverages = {};
      for (const [key, value] of Object.entries(averages)) {
        roundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // --------------- League Average Calculation
      const leagueAveragesResult = await Player.aggregate([
        {
          $match: { Position: found.Position, League: found.League } // Filter documents where Position is equal to the Position of the found player above
        },
        {
          $group: avgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const leagueAverage = leagueAveragesResult.length > 0 ? leagueAveragesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const leagueRoundedAverages = {};
      for (const [key, value] of Object.entries(leagueAverage)) {
        leagueRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // --------------- CS Team Average Calculation
      const csteamAveragesResult = await Player.aggregate([
        {
          $match: { Team_within_selected_timeframe: csteam, Position: found.Position } // Filter documents where Team matches the csteam query param, and position matches initial found players position
        },
        {
          $group: avgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const csteamAverages = csteamAveragesResult.length > 0 ? csteamAveragesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const csteamRoundedAverages = {};
      for (const [key, value] of Object.entries(csteamAverages)) {
        csteamRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // Format final response
      finalData = ({
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          Offensive: [
            {
              label: "Goals per 90",
              player: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2))
            },
            {
              label: "Expected Goals per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2))
            },
            {
              label: "Assists per 90",
              player: parseFloat(((found.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2))
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive runs per 90",
              player: parseFloat(((found.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2))
            }
          ],
          Defensive: [
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Sucessful defensive actions per 90",
              player: parseFloat(((found.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Fouls per 90",
              player: parseFloat(((found.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2))
            },
            {
              label: "Sliding tackles per 90",
              player: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2))
            },
            {
              label: "PAdj Sliding Tackles",
              player: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2))
            },
            {
              label: "Shots blocked per 90",
              player: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2))
            }
          ],
          Passing: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2))
            },
            {
              label: "Smart passes per 90",
              player: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Through passes per 90",
              player: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Passes to penalty area per 90",
              player: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate passes to final third %",
              player: found.Accurate_passes_to_final_third_percentage,
              team: roundedAverages.Accurate_passes_to_final_third_percentage,
              league: leagueRoundedAverages.Accurate_passes_to_final_third_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_to_final_third_percentage
            },
            {
              label: "Accurate through passes %",
              player: found.Accurate_through_passes_percentage,
              team: roundedAverages.Accurate_through_passes_percentage,
              league: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_through_passes_percentage
            }
          ],
          Duels: [
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels won %",
              player: found.Offensive_duels_won_percentage,
              team: roundedAverages.Offensive_duels_won_percentage,
              league: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Offensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            }
          ]
        }
      })
    }

    // If the player is a Goalkeeper
    else {

      // --------------- Team Average Calculation
      const averagesResult = await Player.aggregate([
        {
          $match: { Team_within_selected_timeframe: found.Team_within_selected_timeframe, Position: found.Position } // Filter documents where Team and Position match that of the found player
        },
        {
          $group: gkAvgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const averages = averagesResult.length > 0 ? averagesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const roundedAverages = {};
      for (const [key, value] of Object.entries(averages)) {
        roundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // --------------- League Average Calculation
      const leagueAveragesResult = await Player.aggregate([
        {
          $match: { Position: found.Position, League: found.League } // Filter documents where Position matches that of found player above
        },
        {
          $group: gkAvgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const leagueAverages = leagueAveragesResult.length > 0 ? leagueAveragesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const leagueRoundedAverages = {};
      for (const [key, value] of Object.entries(leagueAverages)) {
        leagueRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // --------------- CS Team Average Calculation
      const csteamAveragesResult = await Player.aggregate([
        {
          $match: { Team_within_selected_timeframe: csteam, Position: found.Position } // Filter documents where Position matches that of found player above
        },
        {
          $group: gkAvgGroup
        },
      ]);

      // If no matching data, set all average fields to null in one step
      const csteamAverages = csteamAveragesResult.length > 0 ? csteamAveragesResult[0] : {};

      // Handle rounding and set defaults using a loop
      const csteamRoundedAverages = {};
      for (const [key, value] of Object.entries(csteamAverages)) {
        csteamRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
      }

      // Format final response
      finalData = ({
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          Offensive: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            }
          ],
          Defensive: [
            {
              label: "Save rate %",
              player: found.Save_rate_percentage,
              team: roundedAverages.Save_rate_percentage,
              league: leagueRoundedAverages.Save_rate_percentage,
              csteam: csteamRoundedAverages.Save_rate_percentage
            },
            {
              label: "Conceded goals per 90",
              player: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots against per 90",
              player: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2))
            },
            {
              label: "Clean sheets",
              player: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2))
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            }
          ],
          Passing: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            }
          ],
          Duels: [
            {
              label: "Duels per 90",
              player: parseFloat(((found.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Duels won %",
              player: found.Duels_won_percentage,
              team: roundedAverages.Duels_won_percentage,
              league: leagueRoundedAverages.Duels_won_percentage,
              csteam: csteamRoundedAverages.Duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            }
          ]
        }
      })
    }

    res.json(finalData);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// Route to get positional specific graph data for specified player
router.get("/get/:id/graph/positional", verifyToken, async (req, res, next) => {

  // Pull id and csteam from url
  const { id } = req.params;
  let { csteam, season } = req.query;

  let originalCsteam = csteam;
  if (csteam) {
    csteam = getSanitizedFieldName(csteam);
  }

  // $group variable
  const avgGroup = {
    _id: null, // Grouping by null to aggregate across all matching documents
    Save_rate_percentage: { $avg: '$Save_rate_percentage' },
    Conceded_goals_per_90: { $avg: '$Conceded_goals_per_90' },
    Shots_against_per_90: { $avg: '$Shots_against_per_90' },
    Clean_sheets: { $avg: '$Clean_sheets' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' },
    Interceptions_per_90: { $avg: '$Interceptions_per_90' },
    Accurate_passes_percentage: { $avg: '$Accurate_passes_percentage' },
    Passes_per_90: { $avg: '$Passes_per_90' },
    Progressive_passes_per_90: { $avg: '$Progressive_passes_per_90' },
    Defensive_duels_per_90: { $avg: '$Defensive_duels_per_90' },
    Defensive_duels_won_percentage: { $avg: '$Defensive_duels_won_percentage' },
    Successful_dribbles_percentage: { $avg: '$Successful_dribbles_percentage' },
    Key_passes_per_90: { $avg: '$Key_passes_per_90' },
    Crosses_per_90: { $avg: '$Crosses_per_90' },
    Accurate_crosses_percentage: { $avg: '$Accurate_crosses_percentage' },
    Touches_in_box_per_90: { $avg: '$Touches_in_box_per_90' },
    Dribbles_per_90: { $avg: '$Dribbles_per_90' },
    Assists_per_90: { $avg: '$Assist_per_90' },
    Shots_per_90: { $avg: '$Shots_per_90' },
    xG_per_90: { $avg: '$xG_per_90' },
    Offensive_duels_per_90: { $avg: '$Offensive_duels_per_90' },
    Goals_per_90: { $avg: '$Goals_per_90' },
    Shots_on_target_percentage: { $avg: '$Shots_on_target_percentage' },
    Non_penalty_goals_per_90: { $avg: '$Non_penalty_goals_per_90' },
  };

  try {

    let found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: `No Player with the ID: ${id}` });

    // If season parameter was provided, find matching player profile
    let seasonFound;
    if (season) seasonFound = await Player.findOne({ Player: found.Player, Team: found.Team, Age: found.Age, Birth_country: found.Birth_country, Passport_country: found.Passport_country, Age: found.Age, Season: season });

    if (seasonFound) {
      found = seasonFound;
    }
    if (season && !seasonFound) {
      return next({ status: 404, message: `No Season Data for Player: ${found.Player} and Season: ${season}` });
    }

    // Fetch max values for specified role
    const maxValues = await getMaxValues(found.Position);

    // Fetch Compatibility Score
    let csValue = null
    if (csteam) {
      const findScore = await CompatibilityScores.findOne({ UniqueID: found.UniqueID });
      if (!findScore) {
        csValue = null
      }
      else {
        csValue = findScore[csteam]
        if (csValue === undefined) {
          csValue = null;
        }
      }
    }

    let formattedData = null;

    // --------------- Team Average Calculation
    const averagesResult = await Player.aggregate([
      {
        $match: { Team_within_selected_timeframe: found.Team_within_selected_timeframe, Position: found.Position } // Filter documents where Team and Position match that of the found player
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const averages = averagesResult.length > 0 ? averagesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const roundedAverages = {};
    for (const [key, value] of Object.entries(averages)) {
      roundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    // --------------- League Average Calculation
    const leagueAveragesResult = await Player.aggregate([
      {
        $match: { Position: found.Position, League: found.League } // Filter documents where Position matches that of found player above
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const leagueAverages = leagueAveragesResult.length > 0 ? leagueAveragesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const leagueRoundedAverages = {};
    for (const [key, value] of Object.entries(leagueAverages)) {
      leagueRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    // --------------- CS Team Average Calculation
    const csteamAveragesResult = await Player.aggregate([
      {
        $match: { Team_within_selected_timeframe: csteam, Position: found.Position } // Filter documents where Position matches that of found player above
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const csteamAverages = csteamAveragesResult.length > 0 ? csteamAveragesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const csteamRoundedAverages = {};
    for (const [key, value] of Object.entries(csteamAverages)) {
      csteamRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    if (found.Position === "GK") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Save rate %",
              player: found.Save_rate_percentage,
              team: roundedAverages.Save_rate_percentage,
              league: leagueRoundedAverages.Save_rate_percentage,
              csteam: csteamRoundedAverages.Save_rate_percentage
            },
            {
              label: "Conceded goals per 90",
              player: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots against per 90",
              player: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2))
            },
            {
              label: "Clean sheets",
              player: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2))
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "RB" || found.Position === "LB") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Crosses per 90",
              player: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "CB") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "CM") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "DM") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "AM") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Assists per 90",
              player: parseFloat(((found.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2))
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2))
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2))
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            }
          ]
        }
      }
    }

    if (found.Position === "RM" || found.Position === "LM") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Crosses per 90",
              player: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "RW" || found.Position === "LW") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Crosses per 90",
              player: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "FWD") {
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          Position: found.Position,
          data: [
            {
              label: "Goals per 90",
              player: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2))
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    res.json(formattedData);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// Route for advanced radar charts (Forwards, Midfielders, Defenders)
router.get("/get/:id/graph/advanced", verifyToken, async (req, res, next) => {

  // Pull id and csteam from url
  const { id } = req.params;
  let { csteam, season } = req.query;

  let originalCsteam = csteam;
  if (csteam) {
    csteam = getSanitizedFieldName(csteam);
  }

  // $group variable
  const avgGroup = {
    _id: null, // Grouping by null to aggregate across all matching documents
    Goals_per_90: { $avg: '$Goals_per_90' },
    Non_penalty_goals_per_90: { $avg: '$Non_penalty_goals_per_90' },
    xG_per_90: { $avg: '$xG_per_90' },
    Shots_per_90: { $avg: '$Shots_per_90' },
    Shots_on_target_percentage: { $avg: '$Shots_on_target_percentage' },
    Goal_conversion_percentage: { $avg: '$Goal_conversion_percentage' },
    Dribbles_per_90: { $avg: '$Dribbles_per_90' },
    Offensive_duels_per_90: { $avg: '$Offensive_duels_per_90' },
    Offensive_duels_won_percentage: { $avg: '$Offensive_duels_won_percentage' },
    Touches_in_box_per_90: { $avg: '$Touches_in_box_per_90' },

    Accurate_passes_percentage: { $avg: '$Accurate_passes_percentage' },
    Passes_per_90: { $avg: '$Passes_per_90' },
    Progressive_passes_per_90: { $avg: '$Progressive_passes_per_90' },
    Key_passes_per_90: { $avg: '$Key_passes_per_90' },
    Passes_to_final_third_per_90: { $avg: '$Passes_to_final_third_per_90' },
    Passes_to_penalty_area_per_90: { $avg: '$Passes_to_penalty_area_per_90' },
    Accurate_passes_to_final_third_percentage: { $avg: '$Accurate_passes_to_final_third_percentage' },
    Smart_passes_per_90: { $avg: '$Smart_passes_per_90' },
    Through_passes_per_90: { $avg: '$Through_passes_per_90' },
    Accurate_through_passes_percentage: { $avg: '$Accurate_through_passes_percentage' },

    Interceptions_per_90: { $avg: '$Interceptions_per_90' },
    Defensive_duels_per_90: { $avg: '$Defensive_duels_per_90' },
    Defensive_duels_won_percentage: { $avg: '$Defensive_duels_won_percentage' },
    Aerial_duels_per_90: { $avg: '$Aerial_duels_per_90' },
    Aerial_duels_won_percentage: { $avg: '$Aerial_duels_won_percentage' },
    Shots_blocked_per_90: { $avg: '$Shots_blocked_per_90' },
    Sliding_tackles_per_90: { $avg: '$Sliding_tackles_per_90' },
    PAdj_Sliding_tackles: { $avg: '$PAdj_Sliding_tackles' },
  };

  try {
    let found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: `No Player with the ID: ${id}` });

    // No Advanced Goalkeeper Graphs currently
    if (found.Position === "GK") return next({ status: 404, message: 'No advanced graphs for GK Position' });

    // If season parameter was provided, find matching player profile
    let seasonFound;
    if (season) seasonFound = await Player.findOne({ Player: found.Player, Team: found.Team, Age: found.Age, Birth_country: found.Birth_country, Passport_country: found.Passport_country, Age: found.Age, Season: season });

    if (seasonFound) {
      found = seasonFound;
    }
    if (season && !seasonFound) {
      return next({ status: 404, message: `No Season Data for Player: ${found.Player} and Season: ${season}` });
    }


    // Fetch max values for specified role
    let maxValues = null;
    let avgPosGroup = null;

    if (found.Position === "AM" || found.Position === "RW" || found.Position === "LW" || found.Position === "FWD") {
      avgPosGroup = ["AM", "RW", "LW", "FWD"];
      maxValues = await getMaxValues(avgPosGroup);
    }

    if (found.Position === "CM" || found.Position === "DM" || found.Position === "LM" || found.Position === "RM") {
      avgPosGroup = ["CM", "DM", "LM", "RM"];
      maxValues = await getMaxValues(avgPosGroup);
    }

    if (found.Position === "CB" || found.Position === "RB" || found.Position === "LB") {
      avgPosGroup = ["CB", "RB", "LB"];
      maxValues = await getMaxValues(avgPosGroup);
    }

    // Fetch Compatibility Score
    let csValue = null
    if (csteam) {
      const findScore = await CompatibilityScores.findOne({ UniqueID: found.UniqueID });
      if (!findScore) {
        csValue = null
      }
      else {
        csValue = findScore[csteam]
        if (csValue === undefined) {
          csValue = null;
        }
      }
    }

    let formattedData = null;

    // --------------- Team Average Calculation
    const averagesResult = await Player.aggregate([
      {
        $match: { Team_within_selected_timeframe: found.Team_within_selected_timeframe, Position: { $in: avgPosGroup } } // Filter documents where Team and Position match that of the found player
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const averages = averagesResult.length > 0 ? averagesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const roundedAverages = {};
    for (const [key, value] of Object.entries(averages)) {
      roundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    // --------------- League Average Calculation
    const leagueAveragesResult = await Player.aggregate([
      {
        $match: { Position: { $in: avgPosGroup }, League: found.League } // Filter documents where Position matches that of found player above
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const leagueAverages = leagueAveragesResult.length > 0 ? leagueAveragesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const leagueRoundedAverages = {};
    for (const [key, value] of Object.entries(leagueAverages)) {
      leagueRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    // --------------- CS Team Average Calculation
    const csteamAveragesResult = await Player.aggregate([
      {
        $match: { Team_within_selected_timeframe: csteam, Position: { $in: avgPosGroup } } // Filter documents where Position matches that of found player above
      },
      {
        $group: avgGroup
      },
    ]);

    // If no matching data, set all average fields to null in one step
    const csteamAverages = csteamAveragesResult.length > 0 ? csteamAveragesResult[0] : {};

    // Handle rounding and set defaults using a loop
    const csteamRoundedAverages = {};
    for (const [key, value] of Object.entries(csteamAverages)) {
      csteamRoundedAverages[key] = value !== undefined ? Math.round(value * 100) / 100 : null;
    }

    if (found.Position === "AM" || found.Position === "RW" || found.Position === "LW" || found.Position === "FWD") {
      const maxValues = await getMaxValues('AM', 'RW', 'LW', 'FWD');
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          graph: "Goal-scoring",
          data: [
            {
              label: "Goals per 90",
              player: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2))
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2))
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2))
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "Goal conversion %",
              player: found.Goal_conversion_percentage,
              team: roundedAverages.Goal_conversion_percentage,
              league: leagueRoundedAverages.Goal_conversion_percentage,
              csteam: csteamRoundedAverages.Goal_conversion_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Offensive duels won %",
              player: found.Offensive_duels_won_percentage,
              team: roundedAverages.Offensive_duels_won_percentage,
              league: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Offensive_duels_won_percentage
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    if (found.Position === "CM" || found.Position === "DM" || found.Position === "LM" || found.Position === "RM") {
      const maxValues = await getMaxValues('CM', 'DM', 'LM', 'RM');
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          graph: "Passing",
          data: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2))
            },
            {
              label: "Passes to penalty area per 90",
              player: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate passes to final third %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Smart passes per 90",
              player: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Through passes per 90",
              player: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2))
            },
            {
              label: "Accurate through passes %",
              player: found.Accurate_through_passes_percentage,
              team: roundedAverages.Accurate_through_passes_percentage,
              league: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_through_passes_percentage
            },
          ]
        }
      }
    }

    if (found.Position === "CB" || found.Position === "RB" || found.Position === "LB") {
      const maxValues = await getMaxValues('CB', 'RB', 'LB');
      formattedData = {
        Player: {
          playerName: found.Player,
          Team: found.Team_within_selected_timeframe,
          League: found.League,
          Season: found.Season,
          csteam: originalCsteam,
          csScore: csValue,
          graph: "Defending",
          data: [
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2))
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Shots blocked per 90",
              player: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2))
            },
            {
              label: "Sliding tackles per 90",
              player: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2))
            },
            {
              label: "PAdj Sliding tackles",
              player: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2))
            }
          ]
        }
      }
    }

    res.json(formattedData);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

// GET route to list all Positions
router.get('/listPositions', async (req, res) => {
  try {
    // Aggregate the collection to find distinct 'Position' values
    const positions = await Player.aggregate([
      {
        // Group by the 'Position' field to get unique values
        $group: {
          _id: '$Position'
        }
      },
      {
        // Rename the field _id to 'Position'
        $project: {
          _id: 0,
          Position: '$_id'
        }
      },
      {
        // Sort the results alphabetically by 'Position'
        $sort: {
          Position: 1
        }
      }
    ]);

    res.json(positions);
  } catch (error) {
    console.error('Error fetching unique positions:', error);
    res.status(500).send('Server error');
  }
});

// GET route to list all roles
router.get('/listRoles', verifyToken, async (req, res) => {
  try {
    const result = {};

    // Iterate through the models in the `models` object
    for (const [modelName, model] of Object.entries(models)) {
      // Get the collection name from the model
      const collectionName = model.collection.collectionName;

      // Query one document to get the field names
      const sampleDocument = await model.findOne().lean();
      if (sampleDocument) {
        // Extract fields, excluding _id and UniqueID, and replace underscores with spaces
        const fields = Object.keys(sampleDocument)
          .filter(key => key !== '_id' && key !== 'UniqueID')
          .map(field => field.replace(/_/g, ' ')); // Replace underscores with spaces
        result[collectionName] = fields;
      } else {
        // Handle empty collection
        result[collectionName] = [];
      }
    }

    // Respond with the result
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching Roles.' });
  }
});

// GET route to get all teams that have compatibility scores
router.get("/listTeams", verifyToken, async (req, res) => {
  try {
    const found = await CompatibilityScores.findOne().lean();
    if (!found) {
      return res.status(404).json({ message: 'No documents found in the collection' });
    }

    const fields = Object.keys(found)
      .filter((field) => field !== '_id' && field !== 'UniqueID' && field !== 'Position')
      .sort();

    // Convert sanitized fields back to their original versions
    const originalFields = fields.map((field) => getOriginalFieldName(field));

    res.json(originalFields);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving Team names' });
  }
});

// GET route to fetch all filterable Seasons
router.get('/listSeasons', verifyToken, async (req, res) => {
  try {
    // Aggregate the collection to find distinct 'Season' values
    const positions = await Player.aggregate([
      {
        // Group by the 'Season' field to get unique values
        $group: {
          _id: '$Season'
        }
      },
      {
        // Rename the field _id to 'Season'
        $project: {
          _id: 0,
          Season: '$_id'
        }
      },
      {
        // Sort the results alphabetically by 'Season'
        $sort: {
          Season: 1
        }
      }
    ]);

    res.json(positions);
  } catch (error) {
    console.error('Error fetching unique Seasons:', error);
    res.status(500).send('Server error');
  }
});

// GET route to fetch all filterable Leagues
router.get('/listLeagues', verifyToken, async (req, res) => {
  try {
    // Aggregate the collection to find distinct 'League' values
    const positions = await Player.aggregate([
      {
        // Group by the 'League' field to get unique values
        $group: {
          _id: '$League'
        }
      },
      {
        // Rename the field _id to 'League'
        $project: {
          _id: 0,
          League: '$_id'
        }
      },
      {
        // Sort the results alphabetically by 'League'
        $sort: {
          League: 1
        }
      }
    ]);

    res.json(positions);
  } catch (error) {
    console.error('Error fetching unique Leagues:', error);
    res.status(500).send('Server error');
  }
});

// GET route to compare two players, outputting both alongside the percentage differences
router.get('/compare/:id1/:id2', verifyToken, async (req, res) => {
  const { id1, id2 } = req.params;
  const { team } = req.query; // Name of the field in CompatibilityScores to retrieve dynamically (if provided)

  try {
    // Fetch players by UniqueID
    const player1 = await Player.findOne({ UniqueID: id1 });
    const player2 = await Player.findOne({ UniqueID: id2 });

    if (!player1 || !player2) {
      return res.status(404).json({ error: 'One or both players not found.' });
    }

    let team1Value = null, team2Value = null; // Initialize team field values

    // Check if 'team' is specified
    if (team) {
      const team1Doc = await CompatibilityScores.findOne({ UniqueID: id1 });
      const team2Doc = await CompatibilityScores.findOne({ UniqueID: id2 });

      team1Value = team1Doc ? team1Doc[team] : null;
      team2Value = team2Doc ? team2Doc[team] : null;
    }

    // Construct player objects with 'Compatibility' field as second field
    const player1WithCompatibility = {
      _id: player1._id,
      Compatibility: team1Value !== null ? team1Value : undefined,
      ...player1.toObject(),
    };

    const player2WithCompatibility = {
      _id: player2._id,
      Compatibility: team2Value !== null ? team2Value : undefined,
      ...player2.toObject(),
    };

    // Extract numerical fields from Player objects
    const numericalFields = Object.keys(player1.toObject()).filter(key =>
      key !== 'UniqueID' &&
      key !== 'Age' &&
      key !== 'Market_value' &&
      // key !== 'Short_Market_Value' &&
      key !== 'Height' &&
      key !== 'Weight' &&
      typeof player1[key] === 'number' &&
      typeof player2[key] === 'number'
    );

    let differences = {};

    // Include Compatibility in differences if it exists
    if (team1Value !== null && team2Value !== null) {
      const compatibilityDifference = calculateSignedPercentageDifference(team1Value, team2Value);
      differences['Compatibility'] = `${compatibilityDifference > 0 ? '+' : ''}${compatibilityDifference}%`;
    }

    // Calculate differences for other numerical fields
    for (const field of numericalFields) {
      if (field.endsWith('percentage')) {
        // Flat difference for percentage fields
        const flatDifference = (player1[field] - player2[field]).toFixed(2);
        differences[field] = `${flatDifference > 0 ? '+' : ''}${flatDifference}%`;
      } else {
        // Percentage difference for standard fields
        const signedDifference = calculateSignedPercentageDifference(player1[field], player2[field]);
        differences[field] = `${signedDifference > 0 ? '+' : ''}${signedDifference}%`;
      }
    }

    // Ensure Compatibility is at the top of differences
    differences = Object.keys(differences)
      .sort((a, b) => (a === 'Compatibility' ? -1 : b === 'Compatibility' ? 1 : 0))
      .reduce((ordered, key) => {
        ordered[key] = differences[key];
        return ordered;
      }, {});

    // Respond with the updated player objects and differences
    res.json({
      player1: player1WithCompatibility,
      player2: player2WithCompatibility,
      differences,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while comparing players.' });
  }
});

module.exports = router;