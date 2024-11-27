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

const models = { AM, CB, CM, DM, FWD, LB, LW, RB, RW };

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
router.get("/get/:id", verifyToken, async ({ params: { id } }, res, next) => {
  try {
    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });

    const transformedResult = {
      _id: found._id,
      UniqueID: found.UniqueID,
      Player: found.Player,
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
      Short_Market_Value: found.Short_Market_Value,
      Contract_expires: found.Contract_expires,
      Minutes_played: found.Minutes_played,
      Matches_played: found.Matches_played,
      Yellow_cards: found.Yellow_cards,
      Red_cards: found.Red_cards,
      Offensive: {
        Goals: found.Goals,
        xG: found.xG,
        Assists: found.Assists,
        xA: found.xA,
        xA_per_90: found.xA_per_90,
        Shot_assists_per_90: found.Shot_assists_per_90,
        Second_assists_per_90: found.Second_assists_per_90,
        Third_assists_per_90: found.Third_assists_per_90,
        Duels_per_90: found.Duels_per_90,
        Duels_won_percentage: found.Duels_won_percentage,
        Fouls_per_90: found.Fouls_per_90,
        Successful_attacking_actions_per_90: found.Successful_attacking_actions_per_90,
        Goals_per_90: found.Goals_per_90,
        Non_penalty_goals: found.Non_penalty_goals,
        Non_penalty_goals_per_90: found.Non_penalty_goals_per_90,
        xG_per_90: found.xG_per_90,
        Head_goals: found.Head_goals,
        Head_goals_per_90: found.Head_goals_per_90,
        Shots: found.Shots,
        Shots_per_90: found.Shots_per_90,
        Shots_on_target_percentage: found.Shots_on_target_percentage,
        Goal_conversion_percentage: found.Goal_conversion_percentage,
        Assists_per_90: found.Assists_per_90,
        Dribbles_per_90: found.Dribbles_per_90,
        Successful_dribbles_percentage: found.Successful_dribbles_percentage,
        Offensive_duels_per_90: found.Offensive_duels_per_90,
        Offensive_duels_won_percentage: found.Offensive_duels_won_percentage,
        Touches_in_box_per_90: found.Touches_in_box_per_90,
        Progressive_runs_per_90: found.Progressive_runs_per_90,
        Accelerations_per_90: found.Accelerations_per_90,
        Free_kicks_per_90: found.Free_kicks_per_90,
        Direct_free_kicks_per_90: found.Direct_free_kicks_per_90,
        Direct_free_kicks_on_target_percentage: found.Direct_free_kicks_on_target_percentage,
        Corners_per_90: found.Corners_per_90,
        Penalties_taken: found.Penalties_taken,
        Penalty_conversion_percentage: found.Penalty_conversion_percentage
      },
      Defensive: {
        Successful_defensive_actions_per_90: found.Successful_defensive_actions_per_90,
        Defensive_duels_per_90: found.Defensive_duels_per_90,
        Defensive_duels_won_percentage: found.Defensive_duels_won_percentage,
        Shots_blocked_per_90: found.Shots_blocked_per_90,
        Interceptions_per_90: found.Interceptions_per_90,
        PAdj_Interceptions: found.PAdj_Interceptions
      },
      Passing: {
        Crosses_per_90: found.Crosses_per_90,
        Accurate_crosses_percentage: found.Accurate_crosses_percentage,
        Crosses_from_left_flank_per_90: found.Crosses_from_left_flank_per_90,
        Accurate_crosses_from_left_flank_percentage: found.Accurate_crosses_from_left_flank_percentage,
        Crosses_from_right_flank_per_90: found.Crosses_from_right_flank_per_90,
        Accurate_crosses_from_right_flank_percentage: found.Accurate_crosses_from_right_flank_percentage,
        Crosses_to_goalie_box_per_90: found.Crosses_to_goalie_box_per_90,
        Received_passes_per_90: found.Received_passes_per_90,
        Received_long_passes_per_90: found.Received_long_passes_per_90,
        Passes_per_90: found.Passes_per_90,
        Accurate_passes_percentage: found.Accurate_passes_percentage,
        Forward_passes_per_90: found.Forward_passes_per_90,
        Accurate_forward_passes_percentage: found.Accurate_forward_passes_percentage,
        Back_passes_per_90: found.Back_passes_per_90,
        Accurate_back_passes_percentage: found.Accurate_back_passes_percentage,
        Lateral_passes_per_90: found.Lateral_passes_per_90,
        Accurate_lateral_passes_percentage: found.Accurate_lateral_passes_percentage,
        Short_medium_passes_per_90: found.Short_medium_passes_per_90,
        Accurate_short_medium_passes_percentage: found.Accurate_short_medium_passes_percentage,
        Long_passes_per_90: found.Long_passes_per_90,
        Accurate_long_passes_percentage: found.Accurate_long_passes_percentage,
        Average_pass_length_m: found.Average_pass_length_m,
        Average_long_pass_length_m: found.Average_long_pass_length_m,
        Smart_passes_per_90: found.Smart_passes_per_90,
        Accurate_smart_passes_percentage: found.Accurate_smart_passes_percentage,
        Key_passes_per_90: found.Key_passes_per_90,
        Passes_to_final_third_per_90: found.Passes_to_final_third_per_90,
        Accurate_passes_to_final_third_percentage: found.Accurate_passes_to_final_third_percentage,
        Passes_to_penalty_area_per_90: found.Passes_to_penalty_area_per_90,
        Accurate_passes_to_penalty_area_percentage: found.Accurate_passes_to_penalty_area_percentage,
        Through_passes_per_90: found.Through_passes_per_90,
        Accurate_through_passes_percentage: found.Accurate_through_passes_percentage,
        Deep_completions_per_90: found.Deep_completions_per_90,
        Deep_completed_crosses_per_90: found.Deep_completed_crosses_per_90,
        Progressive_passes_per_90: found.Progressive_passes_per_90,
        Accurate_progressive_passes_percentage: found.Accurate_progressive_passes_percentage
      },
      Duels: {
        Aerial_duels_per_90: found.Aerial_duels_per_90,
        Aerial_duels_won_percentage: found.Aerial_duels_won_percentage,
        Sliding_tackles_per_90: found.Sliding_tackles_per_90,
        PAdj_Sliding_tackles: found.PAdj_Sliding_tackles,
        Fouls_suffered_per_90: found.Fouls_suffered_per_90
      },
      Goalkeeping: {
        Conceded_goals: found.Conceded_goals,
        Conceded_goals_per_90: found.Conceded_goals_per_90,
        Shots_against: found.Shots_against,
        Shots_against_per_90: found.Shots_against_per_90,
        Clean_sheets: found.Clean_sheets,
        Save_rate_percentage: found.Save_rate_percentage,
        xG_against: found.xG_against,
        xG_against_per_90: found.xG_against_per_90,
        Prevented_goals: found.Prevented_goals,
        Prevented_goals_per_90: found.Prevented_goals_per_90,
        Back_passes_received_as_GK_per_90: found.Back_passes_received_as_GK_per_90,
        Exits_per_90: found.Exits_per_90
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
router.get("/search", verifyToken, async ({ query }, res, next) => {

  // Check if 'value' field exists in the query parameter
  if (!query.value) {
    return res.status(400).json({ message: 'Value is required.' });
  }

  try {
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

// Filter route against Compatability Score - Paginated
router.get('/csfilter', verifyToken, async (req, res) => {
  const { team, minRating, maxRating, minScore, maxScore, minAge, maxAge, minMarketValue, maxMarketValue, selectTeam, selectPosition, page = 1, limit = 10 } = req.query;
  let { role } = req.query;

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

    // Replace spaces with underscores
    role = role.replace(/\s+/g, '_');

    // Check `selectPosition` and validate the `role` in the dynamic collection
    if (selectPosition && role) {
      const DynamicModel = models[selectPosition];

      if (!DynamicModel) {
        return res.status(400).json({ error: `Invalid selectPosition value: ${selectPosition}` });
      }

      // Pipeline to check if role is in top 2 roles for selected player
      const dynamicResults = await DynamicModel.aggregate([
        {
          // Dynamically resolve roleValue
          $addFields: {
            roleValue: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: { $objectToArray: "$$ROOT" },
                            as: "field",
                            cond: { $eq: ["$$field.k", role] }
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
        },
        {
          // Combine all fields with the dynamically resolved roleValue
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
                    [{ k: role, v: "$roleValue" }]
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
          // Sort fields and extract the top two
          $project: {
            UniqueID: 1,
            roleValue: 1,
            roundedRoleValue: { $round: [{ $toDouble: "$roleValue" }, 2] },
            sortedFields: {
              $slice: [
                {
                  $sortArray: {
                    input: {
                      $map: {
                        input: "$combinedFields",
                        as: "field",
                        in: "$$field"
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
          // Compute matchDirectly to see if roleValue is in the top two fields
          $project: {
            UniqueID: 1,
            roleValue: 1,
            roundedRoleValue: 1,
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
                        $eq: [
                          { $round: [{ $toDouble: "$$field.v" }, 2] },
                          { $round: [{ $toDouble: "$roleValue" }, 2] }
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
          Main_Position: 1,
          Position: 1,
          Compatibility_Score: 1,
          Total_Score: 1,
          Age: 1,
          Market_value: 1,
          Minutes_played: 1,
          Matches_played: 1
        },
      },
      {
        $sort: { Compatibility_Score: -1}
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
  const { csteam } = req.query;

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

    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });

    // Fetch max values for specified role
    const maxValues = await getMaxValues(found.Position);

    let formattedData = null;
    let finalData = null;
    // If the player is not a Goalkeeper
    if (found.Position !== "GK") {
      // Format required data
      formattedData = {
        "Player": found.Player,
        Offensive: [
          { label: "Goals per 90", trueValue: found.Goals_per_90, score: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
          { label: "Expected Goals per 90", trueValue: found.xG_per_90, score: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
          { label: "Shots per 90", trueValue: found.Shots_per_90, score: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
          { label: "Assists per 90", trueValue: found.Assists_per_90, score: parseFloat(((found.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
          { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
          { label: "Successful dribbles %", trueValue: found.Successful_dribbles_percentage, score: found.Successful_dribbles_percentage },
          { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
          { label: "Progressive runs per 90", trueValue: found.Progressive_runs_per_90, score: parseFloat(((found.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)) },
          { label: "Shots on target %", trueValue: found.Shots_on_target_percentage, score: found.Shots_on_target_percentage },
          { label: "Non-penalty goals per 90", trueValue: found.Non_penalty_goals_per_90, score: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
        ]
        ,
        Defensive: [
          { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
          { label: "Defensive duels won %", trueValue: found.Defensive_duels_won_percentage, score: found.Defensive_duels_won_percentage },
          { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
          { label: "Sucessful defensive actions per 90", trueValue: found.Successful_defensive_actions_per_90, score: parseFloat(((found.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage },
          { label: "Fouls per 90", trueValue: found.Fouls_per_90, score: parseFloat(((found.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)) },
          { label: "Sliding tackles per 90", trueValue: found.Sliding_tackles_per_90, score: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)) },
          { label: "PAdj Sliding Tackles", trueValue: found.PAdj_Sliding_tackles, score: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)) },
          { label: "Shots blocked per 90", trueValue: found.Shots_blocked_per_90, score: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)) }
        ],
        Passing: [
          { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
          { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
          { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
          { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
          { label: "Passes to final third per 90", trueValue: found.Passes_to_final_third_per_90, score: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
          { label: "Smart passes per 90", trueValue: found.Smart_passes_per_90, score: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)) },
          { label: "Through passes per 90", trueValue: found.Through_passes_per_90, score: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)) },
          { label: "Passes to penalty area per 90", trueValue: found.Passes_to_penalty_area_per_90, score: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)) },
          { label: "Accurate passes to final third %", trueValue: found.Accurate_passes_to_final_third_percentage, score: found.Accurate_passes_to_final_third_percentage },
          { label: "Accurate through passes %", trueValue: found.Accurate_through_passes_percentage, score: found.Accurate_through_passes_percentage }
        ],
        Duels: [
          { label: "Offensive duels per 90", trueValue: found.Offensive_duels_per_90, score: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
          { label: "Offensive duels won %", trueValue: found.Offensive_duels_won_percentage, score: found.Offensive_duels_won_percentage },
          { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage }
        ]
      }

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
          $match: { Position: found.Position } // Filter documents where Position is equal to the Position of the found player above
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
        playerData: formattedData,
        teamData: {
          Team: found.Team_within_selected_timeframe,
          Position: found.Position,
          Offensive: [
            { label: "Goals per 90", trueValue: roundedAverages.Goals_per_90, score: parseFloat(((roundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Expected Goals per 90", trueValue: roundedAverages.xG_per_90, score: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: roundedAverages.Shots_per_90, score: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Assists per 90", trueValue: roundedAverages.Assists_per_90, score: parseFloat(((roundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: roundedAverages.Successful_dribbles_percentage, score: roundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive runs per 90", trueValue: roundedAverages.Progressive_runs_per_90, score: parseFloat(((roundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: roundedAverages.Shots_on_target_percentage, score: roundedAverages.Shots_on_target_percentage },
            { label: "Non-penalty goals per 90", trueValue: roundedAverages.Non_penalty_goals_per_90, score: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Defensive duels per 90", trueValue: roundedAverages.Defensive_duels_per_90, score: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: roundedAverages.Defensive_duels_won_percentage, score: roundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: roundedAverages.Interceptions_per_90, score: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Sucessful defensive actions per 90", trueValue: roundedAverages.Successful_defensive_actions_per_90, score: parseFloat(((roundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage },
            { label: "Fouls per 90", trueValue: roundedAverages.Fouls_per_90, score: parseFloat(((roundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)) },
            { label: "Sliding tackles per 90", trueValue: roundedAverages.Sliding_tackles_per_90, score: parseFloat(((roundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)) },
            { label: "PAdj Sliding Tackles", trueValue: roundedAverages.PAdj_Sliding_tackles, score: parseFloat(((roundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)) },
            { label: "Shots blocked per 90", trueValue: roundedAverages.Shots_blocked_per_90, score: parseFloat(((roundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)) }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: roundedAverages.Passes_per_90, score: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to final third per 90", trueValue: roundedAverages.Passes_to_final_third_per_90, score: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Smart passes per 90", trueValue: roundedAverages.Smart_passes_per_90, score: parseFloat(((roundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)) },
            { label: "Through passes per 90", trueValue: roundedAverages.Through_passes_per_90, score: parseFloat(((roundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to penalty area per 90", trueValue: roundedAverages.Passes_to_penalty_area_per_90, score: parseFloat(((roundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)) },
            { label: "Accurate passes to final third %", trueValue: roundedAverages.Accurate_passes_to_final_third_percentage, score: roundedAverages.Accurate_passes_to_final_third_percentage },
            { label: "Accurate through passes %", trueValue: roundedAverages.Accurate_through_passes_percentage, score: roundedAverages.Accurate_through_passes_percentage }
          ],
          Duels: [
            { label: "Offensive duels per 90", trueValue: roundedAverages.Offensive_duels_per_90, score: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels won %", trueValue: roundedAverages.Offensive_duels_won_percentage, score: roundedAverages.Offensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage }
          ]
        },
        leagueData: {
          Position: found.Position,
          Offensive: [
            { label: "Goals per 90", trueValue: leagueRoundedAverages.Goals_per_90, score: parseFloat(((leagueRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Expected Goals per 90", trueValue: leagueRoundedAverages.xG_per_90, score: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: leagueRoundedAverages.Shots_per_90, score: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Assists per 90", trueValue: leagueRoundedAverages.Assists_per_90, score: parseFloat(((leagueRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: leagueRoundedAverages.Successful_dribbles_percentage, score: leagueRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive runs per 90", trueValue: leagueRoundedAverages.Progressive_runs_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: leagueRoundedAverages.Shots_on_target_percentage, score: leagueRoundedAverages.Shots_on_target_percentage },
            { label: "Non-penalty goals per 90", trueValue: leagueRoundedAverages.Non_penalty_goals_per_90, score: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Defensive duels per 90", trueValue: leagueRoundedAverages.Defensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: leagueRoundedAverages.Defensive_duels_won_percentage, score: leagueRoundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: leagueRoundedAverages.Interceptions_per_90, score: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Sucessful defensive actions per 90", trueValue: leagueRoundedAverages.Successful_defensive_actions_per_90, score: parseFloat(((leagueRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage },
            { label: "Fouls per 90", trueValue: leagueRoundedAverages.Fouls_per_90, score: parseFloat(((leagueRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)) },
            { label: "Sliding tackles per 90", trueValue: leagueRoundedAverages.Sliding_tackles_per_90, score: parseFloat(((leagueRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)) },
            { label: "PAdj Sliding Tackles", trueValue: leagueRoundedAverages.PAdj_Sliding_tackles, score: parseFloat(((leagueRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)) },
            { label: "Shots blocked per 90", trueValue: leagueRoundedAverages.Shots_blocked_per_90, score: parseFloat(((leagueRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)) }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: leagueRoundedAverages.Passes_per_90, score: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to final third per 90", trueValue: leagueRoundedAverages.Passes_to_final_third_per_90, score: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Smart passes per 90", trueValue: leagueRoundedAverages.Smart_passes_per_90, score: parseFloat(((leagueRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)) },
            { label: "Through passes per 90", trueValue: leagueRoundedAverages.Through_passes_per_90, score: parseFloat(((leagueRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to penalty area per 90", trueValue: leagueRoundedAverages.Passes_to_penalty_area_per_90, score: parseFloat(((leagueRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)) },
            { label: "Accurate passes to final third %", trueValue: leagueRoundedAverages.Accurate_passes_to_final_third_percentage, score: leagueRoundedAverages.Accurate_passes_to_final_third_percentage },
            { label: "Accurate through passes %", trueValue: leagueRoundedAverages.Accurate_through_passes_percentage, score: leagueRoundedAverages.Accurate_through_passes_percentage }
          ],
          Duels: [
            { label: "Offensive duels per 90", trueValue: leagueRoundedAverages.Offensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels won %", trueValue: leagueRoundedAverages.Offensive_duels_won_percentage, score: leagueRoundedAverages.Offensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          Offensive: [
            { label: "Goals per 90", trueValue: csteamRoundedAverages.Goals_per_90, score: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Expected Goals per 90", trueValue: csteamRoundedAverages.xG_per_90, score: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: csteamRoundedAverages.Shots_per_90, score: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Assists per 90", trueValue: csteamRoundedAverages.Assists_per_90, score: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: csteamRoundedAverages.Successful_dribbles_percentage, score: csteamRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive runs per 90", trueValue: csteamRoundedAverages.Progressive_runs_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: csteamRoundedAverages.Shots_on_target_percentage, score: csteamRoundedAverages.Shots_on_target_percentage },
            { label: "Non-penalty goals per 90", trueValue: csteamRoundedAverages.Non_penalty_goals_per_90, score: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Defensive duels per 90", trueValue: csteamRoundedAverages.Defensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: csteamRoundedAverages.Defensive_duels_won_percentage, score: csteamRoundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: csteamRoundedAverages.Interceptions_per_90, score: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Sucessful defensive actions per 90", trueValue: csteamRoundedAverages.Successful_defensive_actions_per_90, score: parseFloat(((csteamRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage },
            { label: "Fouls per 90", trueValue: csteamRoundedAverages.Fouls_per_90, score: parseFloat(((csteamRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)) },
            { label: "Sliding tackles per 90", trueValue: csteamRoundedAverages.Sliding_tackles_per_90, score: parseFloat(((csteamRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)) },
            { label: "PAdj Sliding Tackles", trueValue: csteamRoundedAverages.PAdj_Sliding_tackles, score: parseFloat(((csteamRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)) },
            { label: "Shots blocked per 90", trueValue: csteamRoundedAverages.Shots_blocked_per_90, score: parseFloat(((csteamRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)) }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: csteamRoundedAverages.Passes_per_90, score: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to final third per 90", trueValue: csteamRoundedAverages.Passes_to_final_third_per_90, score: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Smart passes per 90", trueValue: csteamRoundedAverages.Smart_passes_per_90, score: parseFloat(((csteamRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)) },
            { label: "Through passes per 90", trueValue: csteamRoundedAverages.Through_passes_per_90, score: parseFloat(((csteamRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)) },
            { label: "Passes to penalty area per 90", trueValue: csteamRoundedAverages.Passes_to_penalty_area_per_90, score: parseFloat(((csteamRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)) },
            { label: "Accurate passes to final third %", trueValue: csteamRoundedAverages.Accurate_passes_to_final_third_percentage, score: csteamRoundedAverages.Accurate_passes_to_final_third_percentage },
            { label: "Accurate through passes %", trueValue: csteamRoundedAverages.Accurate_through_passes_percentage, score: csteamRoundedAverages.Accurate_through_passes_percentage }
          ],
          Duels: [
            { label: "Offensive duels per 90", trueValue: csteamRoundedAverages.Offensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels won %", trueValue: csteamRoundedAverages.Offensive_duels_won_percentage, score: csteamRoundedAverages.Offensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage }
          ]
        }
      })
    }

    // If the player is a Goalkeeper
    else {
      formattedData = {
        "Player": found.Player,
        Offensive: [
          { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
          { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
          { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
        ],
        Defensive: [
          { label: "Save rate %", trueValue: found.Save_rate_percentage, score: found.Save_rate_percentage },
          { label: "Conceded goals per 90", trueValue: found.Conceded_goals_per_90, score: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
          { label: "Shots against per 90", trueValue: found.Shots_against_per_90, score: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
          { label: "Clean sheets", trueValue: found.Clean_sheets, score: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
          { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage }
        ],
        Passing: [
          { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
          { label: "Passes to final third per 90", trueValue: found.Passes_to_final_third_per_90, score: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
          { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
        ],
        Duels: [
          { label: "Duels per 90", trueValue: found.Duels_per_90, score: parseFloat(((found.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)) },
          { label: "Duels won %", trueValue: found.Duels_won_percentage, score: found.Duels_won_percentage },
          { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage }
        ]
      }

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
          $match: { Position: found.Position } // Filter documents where Position matches that of found player above
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
        playerData: formattedData,
        teamData: {
          Team: found.Team_within_selected_timeframe,
          Position: found.Position,
          Offensive: [
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: roundedAverages.Passes_per_90, score: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Save rate %", trueValue: roundedAverages.Save_rate_percentage, score: roundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: roundedAverages.Conceded_goals_per_90, score: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: roundedAverages.Shots_against_per_90, score: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: roundedAverages.Clean_sheets, score: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes to final third per 90", trueValue: roundedAverages.Passes_to_final_third_per_90, score: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Duels: [
            { label: "Duels per 90", trueValue: roundedAverages.Duels_per_90, score: parseFloat(((roundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)) },
            { label: "Duels won %", trueValue: roundedAverages.Duels_won_percentage, score: roundedAverages.Duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage }
          ]
        },
        leagueData: {
          Position: found.Position,
          Offensive: [
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: leagueRoundedAverages.Passes_per_90, score: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Save rate %", trueValue: leagueRoundedAverages.Save_rate_percentage, score: leagueRoundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: leagueRoundedAverages.Conceded_goals_per_90, score: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: leagueRoundedAverages.Shots_against_per_90, score: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: leagueRoundedAverages.Clean_sheets, score: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes to final third per 90", trueValue: leagueRoundedAverages.Passes_to_final_third_per_90, score: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Duels: [
            { label: "Duels per 90", trueValue: leagueRoundedAverages.Duels_per_90, score: parseFloat(((leagueRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)) },
            { label: "Duels won %", trueValue: leagueRoundedAverages.Duels_won_percentage, score: leagueRoundedAverages.Duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          Offensive: [
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: csteamRoundedAverages.Passes_per_90, score: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Defensive: [
            { label: "Save rate %", trueValue: csteamRoundedAverages.Save_rate_percentage, score: csteamRoundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: csteamRoundedAverages.Conceded_goals_per_90, score: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: csteamRoundedAverages.Shots_against_per_90, score: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: csteamRoundedAverages.Clean_sheets, score: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage }
          ],
          Passing: [
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes to final third per 90", trueValue: csteamRoundedAverages.Passes_to_final_third_per_90, score: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ],
          Duels: [
            { label: "Duels per 90", trueValue: csteamRoundedAverages.Duels_per_90, score: parseFloat(((csteamRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)) },
            { label: "Duels won %", trueValue: csteamRoundedAverages.Duels_won_percentage, score: csteamRoundedAverages.Duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage }
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
  const { csteam } = req.query;

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
    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });

    // Fetch max values for specified role
    const maxValues = await getMaxValues(found.Position);

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
        $match: { Position: found.Position } // Filter documents where Position matches that of found player above
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
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Save rate %", trueValue: found.Save_rate_percentage, score: found.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: found.Conceded_goals_per_90, score: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: found.Shots_against_per_90, score: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: found.Clean_sheets, score: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Save rate %", trueValue: roundedAverages.Save_rate_percentage, score: roundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: roundedAverages.Conceded_goals_per_90, score: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: roundedAverages.Shots_against_per_90, score: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: roundedAverages.Clean_sheets, score: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: roundedAverages.Interceptions_per_90, score: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: roundedAverages.Passes_per_90, score: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Save rate %", trueValue: leagueRoundedAverages.Save_rate_percentage, score: leagueRoundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: leagueRoundedAverages.Conceded_goals_per_90, score: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: leagueRoundedAverages.Shots_against_per_90, score: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: leagueRoundedAverages.Clean_sheets, score: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: leagueRoundedAverages.Interceptions_per_90, score: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: leagueRoundedAverages.Passes_per_90, score: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Save rate %", trueValue: csteamRoundedAverages.Save_rate_percentage, score: csteamRoundedAverages.Save_rate_percentage },
            { label: "Conceded goals per 90", trueValue: csteamRoundedAverages.Conceded_goals_per_90, score: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)) },
            { label: "Shots against per 90", trueValue: csteamRoundedAverages.Shots_against_per_90, score: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)) },
            { label: "Clean sheets", trueValue: csteamRoundedAverages.Clean_sheets, score: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)) },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: csteamRoundedAverages.Interceptions_per_90, score: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: csteamRoundedAverages.Passes_per_90, score: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "RB" || found.Position === "LB") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: found.Defensive_duels_won_percentage, score: found.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: found.Successful_dribbles_percentage, score: found.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Crosses per 90", trueValue: found.Crosses_per_90, score: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: found.Accurate_crosses_percentage, score: found.Accurate_crosses_percentage },
            { label: "Touches in box per 90", trueValue: found.Touches_in_box_per_90, score: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: roundedAverages.Defensive_duels_per_90, score: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: roundedAverages.Defensive_duels_won_percentage, score: roundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: roundedAverages.Successful_dribbles_percentage, score: roundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Crosses per 90", trueValue: roundedAverages.Crosses_per_90, score: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: roundedAverages.Accurate_crosses_percentage, score: roundedAverages.Accurate_crosses_percentage },
            { label: "Touches in box per 90", trueValue: roundedAverages.Touches_in_box_per_90, score: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: leagueRoundedAverages.Defensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: leagueRoundedAverages.Defensive_duels_won_percentage, score: leagueRoundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: leagueRoundedAverages.Successful_dribbles_percentage, score: leagueRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Crosses per 90", trueValue: leagueRoundedAverages.Crosses_per_90, score: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: leagueRoundedAverages.Accurate_crosses_percentage, score: leagueRoundedAverages.Accurate_crosses_percentage },
            { label: "Touches in box per 90", trueValue: leagueRoundedAverages.Touches_in_box_per_90, score: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: csteamRoundedAverages.Defensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: csteamRoundedAverages.Defensive_duels_won_percentage, score: csteamRoundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: csteamRoundedAverages.Successful_dribbles_percentage, score: csteamRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Crosses per 90", trueValue: csteamRoundedAverages.Crosses_per_90, score: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: csteamRoundedAverages.Accurate_crosses_percentage, score: csteamRoundedAverages.Accurate_crosses_percentage },
            { label: "Touches in box per 90", trueValue: csteamRoundedAverages.Touches_in_box_per_90, score: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "CB") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: found.Defensive_duels_won_percentage, score: found.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
            { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: roundedAverages.Defensive_duels_per_90, score: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: roundedAverages.Defensive_duels_won_percentage, score: roundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: roundedAverages.Aerial_duels_per_90, score: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: roundedAverages.Aerial_duels_won_percentage, score: roundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: roundedAverages.Interceptions_per_90, score: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: leagueRoundedAverages.Defensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: leagueRoundedAverages.Defensive_duels_won_percentage, score: leagueRoundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: leagueRoundedAverages.Aerial_duels_per_90, score: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: leagueRoundedAverages.Aerial_duels_won_percentage, score: leagueRoundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: leagueRoundedAverages.Interceptions_per_90, score: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: csteamRoundedAverages.Defensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: csteamRoundedAverages.Defensive_duels_won_percentage, score: csteamRoundedAverages.Defensive_duels_won_percentage },
            { label: "Aerial duels per 90", trueValue: csteamRoundedAverages.Aerial_duels_per_90, score: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
            { label: "Aerial duels won %", trueValue: csteamRoundedAverages.Aerial_duels_won_percentage, score: csteamRoundedAverages.Aerial_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: csteamRoundedAverages.Interceptions_per_90, score: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "CM") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: roundedAverages.Passes_per_90, score: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Interceptions per 90", trueValue: roundedAverages.Interceptions_per_90, score: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels per 90", trueValue: roundedAverages.Defensive_duels_per_90, score: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: leagueRoundedAverages.Passes_per_90, score: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Interceptions per 90", trueValue: leagueRoundedAverages.Interceptions_per_90, score: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels per 90", trueValue: leagueRoundedAverages.Defensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: csteamRoundedAverages.Passes_per_90, score: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Interceptions per 90", trueValue: csteamRoundedAverages.Interceptions_per_90, score: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels per 90", trueValue: csteamRoundedAverages.Defensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "DM") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: found.Defensive_duels_won_percentage, score: found.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: roundedAverages.Defensive_duels_per_90, score: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: roundedAverages.Defensive_duels_won_percentage, score: roundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: roundedAverages.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: roundedAverages.Passes_per_90, score: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: roundedAverages.Progressive_passes_per_90, score: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: leagueRoundedAverages.Defensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: leagueRoundedAverages.Defensive_duels_won_percentage, score: leagueRoundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: leagueRoundedAverages.Interceptions_per_90, score: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: leagueRoundedAverages.Passes_per_90, score: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: leagueRoundedAverages.Progressive_passes_per_90, score: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Defensive duels per 90", trueValue: csteamRoundedAverages.Defensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Defensive duels won %", trueValue: csteamRoundedAverages.Defensive_duels_won_percentage, score: csteamRoundedAverages.Defensive_duels_won_percentage },
            { label: "Interceptions per 90", trueValue: csteamRoundedAverages.Interceptions_per_90, score: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage },
            { label: "Passes per 90", trueValue: csteamRoundedAverages.Passes_per_90, score: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
            { label: "Progressive passes per 90", trueValue: csteamRoundedAverages.Progressive_passes_per_90, score: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "AM") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Assists per 90", trueValue: found.Assists_per_90, score: parseFloat(((found.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: found.Shots_per_90, score: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "xG per 90", trueValue: found.xG_per_90, score: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: found.Successful_dribbles_percentage, score: found.Successful_dribbles_percentage },
            { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Assists per 90", trueValue: roundedAverages.Assists_per_90, score: parseFloat(((roundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: roundedAverages.Shots_per_90, score: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "xG per 90", trueValue: roundedAverages.xG_per_90, score: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: roundedAverages.Successful_dribbles_percentage, score: roundedAverages.Successful_dribbles_percentage },
            { label: "Pass completion %", trueValue: roundedAverages.Accurate_passes_percentage, score: roundedAverages.Accurate_passes_percentage }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Assists per 90", trueValue: leagueRoundedAverages.Assists_per_90, score: parseFloat(((leagueRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: leagueRoundedAverages.Shots_per_90, score: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "xG per 90", trueValue: leagueRoundedAverages.xG_per_90, score: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: leagueRoundedAverages.Successful_dribbles_percentage, score: leagueRoundedAverages.Successful_dribbles_percentage },
            { label: "Pass completion %", trueValue: leagueRoundedAverages.Accurate_passes_percentage, score: leagueRoundedAverages.Accurate_passes_percentage }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Assists per 90", trueValue: csteamRoundedAverages.Assists_per_90, score: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)) },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: csteamRoundedAverages.Shots_per_90, score: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "xG per 90", trueValue: csteamRoundedAverages.xG_per_90, score: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: csteamRoundedAverages.Successful_dribbles_percentage, score: csteamRoundedAverages.Successful_dribbles_percentage },
            { label: "Pass completion %", trueValue: csteamRoundedAverages.Accurate_passes_percentage, score: csteamRoundedAverages.Accurate_passes_percentage }
          ]
        }
      }
    }

    if (found.Position === "RM" || found.Position === "LM") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: found.Crosses_per_90, score: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: found.Accurate_crosses_percentage, score: found.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: found.Successful_dribbles_percentage, score: found.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: found.Offensive_duels_per_90, score: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: found.Touches_in_box_per_90, score: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: roundedAverages.Crosses_per_90, score: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: roundedAverages.Accurate_crosses_percentage, score: roundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: roundedAverages.Successful_dribbles_percentage, score: roundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: roundedAverages.Offensive_duels_per_90, score: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: roundedAverages.Touches_in_box_per_90, score: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: leagueRoundedAverages.Crosses_per_90, score: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: leagueRoundedAverages.Accurate_crosses_percentage, score: leagueRoundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: leagueRoundedAverages.Successful_dribbles_percentage, score: leagueRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: leagueRoundedAverages.Offensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: leagueRoundedAverages.Touches_in_box_per_90, score: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Crosses per 90", trueValue: csteamRoundedAverages.Crosses_per_90, score: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: csteamRoundedAverages.Accurate_crosses_percentage, score: csteamRoundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: csteamRoundedAverages.Successful_dribbles_percentage, score: csteamRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: csteamRoundedAverages.Offensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: csteamRoundedAverages.Touches_in_box_per_90, score: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "RW" || found.Position === "LW") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: found.Crosses_per_90, score: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: found.Accurate_crosses_percentage, score: found.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: found.Successful_dribbles_percentage, score: found.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: found.Offensive_duels_per_90, score: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: found.Touches_in_box_per_90, score: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: roundedAverages.Crosses_per_90, score: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: roundedAverages.Accurate_crosses_percentage, score: roundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: roundedAverages.Successful_dribbles_percentage, score: roundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: roundedAverages.Key_passes_per_90, score: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: roundedAverages.Offensive_duels_per_90, score: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: roundedAverages.Touches_in_box_per_90, score: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Crosses per 90", trueValue: leagueRoundedAverages.Crosses_per_90, score: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: leagueRoundedAverages.Accurate_crosses_percentage, score: leagueRoundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: leagueRoundedAverages.Successful_dribbles_percentage, score: leagueRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: leagueRoundedAverages.Key_passes_per_90, score: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: leagueRoundedAverages.Offensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: leagueRoundedAverages.Touches_in_box_per_90, score: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Crosses per 90", trueValue: csteamRoundedAverages.Crosses_per_90, score: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)) },
            { label: "Accurate crosses %", trueValue: csteamRoundedAverages.Accurate_crosses_percentage, score: csteamRoundedAverages.Accurate_crosses_percentage },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Successful dribbles %", trueValue: csteamRoundedAverages.Successful_dribbles_percentage, score: csteamRoundedAverages.Successful_dribbles_percentage },
            { label: "Key passes per 90", trueValue: csteamRoundedAverages.Key_passes_per_90, score: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: csteamRoundedAverages.Offensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Touches in box per 90", trueValue: csteamRoundedAverages.Touches_in_box_per_90, score: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
          ]
        }
      }
    }

    if (found.Position === "FWD") {
      formattedData = {
        playerData: {
          "Player": found.Player,
          "Position": found.Position,
          data: [
            { label: "Goals per 90", trueValue: found.Goals_per_90, score: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: found.Shots_per_90, score: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: found.Shots_on_target_percentage, score: found.Shots_on_target_percentage },
            { label: "xG per 90", trueValue: found.xG_per_90, score: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: found.Offensive_duels_per_90, score: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Non-penalty goals per 90", trueValue: found.Non_penalty_goals_per_90, score: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ]
        },
        teamData: {
          "Team": found.Team_within_selected_timeframe,
          "Position": found.Position,
          data: [
            { label: "Goals per 90", trueValue: roundedAverages.Goals_per_90, score: parseFloat(((roundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: roundedAverages.Shots_per_90, score: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: roundedAverages.Shots_on_target_percentage, score: roundedAverages.Shots_on_target_percentage },
            { label: "xG per 90", trueValue: roundedAverages.xG_per_90, score: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: roundedAverages.Dribbles_per_90, score: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: roundedAverages.Offensive_duels_per_90, score: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Non-penalty goals per 90", trueValue: roundedAverages.Non_penalty_goals_per_90, score: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ]
        },
        leagueData: {
          "Position": found.Position,
          data: [
            { label: "Goals per 90", trueValue: leagueRoundedAverages.Goals_per_90, score: parseFloat(((leagueRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: leagueRoundedAverages.Shots_per_90, score: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: leagueRoundedAverages.Shots_on_target_percentage, score: leagueRoundedAverages.Shots_on_target_percentage },
            { label: "xG per 90", trueValue: leagueRoundedAverages.xG_per_90, score: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: leagueRoundedAverages.Dribbles_per_90, score: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: leagueRoundedAverages.Offensive_duels_per_90, score: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Non-penalty goals per 90", trueValue: leagueRoundedAverages.Non_penalty_goals_per_90, score: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
          ]
        },
        csteamData: {
          Team: csteam,
          Position: found.Position,
          data: [
            { label: "Goals per 90", trueValue: csteamRoundedAverages.Goals_per_90, score: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
            { label: "Shots per 90", trueValue: csteamRoundedAverages.Shots_per_90, score: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
            { label: "Shots on target %", trueValue: csteamRoundedAverages.Shots_on_target_percentage, score: csteamRoundedAverages.Shots_on_target_percentage },
            { label: "xG per 90", trueValue: csteamRoundedAverages.xG_per_90, score: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
            { label: "Dribbles per 90", trueValue: csteamRoundedAverages.Dribbles_per_90, score: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
            { label: "Offensive duels per 90", trueValue: csteamRoundedAverages.Offensive_duels_per_90, score: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
            { label: "Non-penalty goals per 90", trueValue: csteamRoundedAverages.Non_penalty_goals_per_90, score: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) }
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
router.get("/get/:id/graph/advanced", verifyToken, async ({ params: { id } }, res, next) => {
  try {
    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });

    let formattedData = null;

    if (found.Position === "AM" || found.Position === "RW" || found.Position === "LW" || found.Position === "FWD") {
      const maxValues = await getMaxValues('AM', 'RW', 'LW', 'FWD');
      formattedData = {
        "Player": found.Player,
        "Graph": "Goal-scoring",
        data: [
          { label: "Goals per 90", trueValue: found.Goals_per_90, score: parseFloat(((found.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)) },
          { label: "Non-penalty goals per 90", trueValue: found.Non_penalty_goals_per_90, score: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)) },
          { label: "xG per 90", trueValue: found.xG_per_90, score: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)) },
          { label: "Shots per 90", trueValue: found.Shots_per_90, score: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)) },
          { label: "Shots on target %", trueValue: found.Shots_on_target_percentage, score: found.Shots_on_target_percentage },
          { label: "Goal conversion %", trueValue: found.Goal_conversion_percentage, score: found.Goal_conversion_percentage },
          { label: "Dribbles per 90", trueValue: found.Dribbles_per_90, score: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)) },
          { label: "Offensive duels per 90", trueValue: found.Offensive_duels_per_90, score: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)) },
          { label: "Offensive duels won %", trueValue: found.Offensive_duels_won_percentage, score: found.Offensive_duels_won_percentage },
          { label: "Touches in box per 90", trueValue: found.Touches_in_box_per_90, score: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)) }
        ]
      }
    }

    if (found.Position === "CM" || found.Position === "DM" || found.Position === "LM" || found.Position === "RM") {
      const maxValues = await getMaxValues('CM', 'DM', 'LM', 'RM');
      formattedData = {
        "Player": found.Player,
        "Graph": "Passing",
        data: [
          { label: "Pass completion %", trueValue: found.Accurate_passes_percentage, score: found.Accurate_passes_percentage },
          { label: "Passes per 90", trueValue: found.Passes_per_90, score: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)) },
          { label: "Progressive passes per 90", trueValue: found.Progressive_passes_per_90, score: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)) },
          { label: "Key passes per 90", trueValue: found.Key_passes_per_90, score: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)) },
          { label: "Passes to final third per 90", trueValue: found.Passes_to_final_third_per_90, score: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)) },
          { label: "Passes to penalty area per 90", trueValue: found.Passes_to_penalty_area_per_90, score: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)) },
          { label: "Accurate passes to final third %", trueValue: found.Accurate_passes_to_final_third_percentage, score: found.Accurate_passes_percentage },
          { label: "Smart passes per 90", trueValue: found.Smart_passes_per_90, score: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)) },
          { label: "Through passes per 90", trueValue: found.Through_passes_per_90, score: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)) },
          { label: "Accurate through passes %", trueValue: found.Accurate_through_passes_percentage, score: found.Accurate_through_passes_percentage },
        ]
      }
    }

    if (found.Position === "CB" || found.Position === "RB" || found.Position === "LB") {
      const maxValues = await getMaxValues('CB', 'RB', 'LB');
      formattedData = {
        "Player": found.Player,
        "Graph": "Defending",
        data: [
          { label: "Interceptions per 90", trueValue: found.Interceptions_per_90, score: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)) },
          { label: "Defensive duels per 90", trueValue: found.Defensive_duels_per_90, score: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)) },
          { label: "Defensive duels won %", trueValue: found.Defensive_duels_won_percentage, score: found.Defensive_duels_won_percentage },
          { label: "Aerial duels per 90", trueValue: found.Aerial_duels_per_90, score: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)) },
          { label: "Aerial duels won %", trueValue: found.Aerial_duels_won_percentage, score: found.Aerial_duels_won_percentage },
          { label: "Shots blocked per 90", trueValue: found.Shots_blocked_per_90, score: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)) },
          { label: "Sliding tackles per 90", trueValue: found.Sliding_tackles_per_90, score: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)) },
          { label: "PAdj Sliding tackles", trueValue: found.PAdj_Sliding_tackles, score: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)) }
        ]
      }
    }

    res.json(formattedData);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Players", error })
  }
});

router.get('/listPositions', async (req, res) => {
  try {
    // Aggregate the collection to find distinct 'Main_Position' values
    const positions = await Player.aggregate([
      {
        // Group by the 'Main_Position' field to get unique values
        $group: {
          _id: '$Main_Position'
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
    res.status(500).json({ error: 'An error occurred while fetching collection fields.' });
}
});

module.exports = router;