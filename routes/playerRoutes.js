const router = require("express").Router();
const Player = require("../models/player");
const verifyToken = require('../middleware/auth');

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
        Successful_dribbles_percentage: found.Successful_drribles_percentage,
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
        Smart_passes_per_90: found.Smart_passses_per_90,
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
          Position: 1,
          Compatibility_Score: 1,
          Total_Score: 1,
          Age: 1,
          Market_value: 1,
          Minutes_played: 1,
          Matches_played: 1
        },
      },
    ];

    // Step 7: Execute pagination query
    const playersWithFilteredRatings = await Player.aggregate(paginatedPipeline);

    // Step 8: Construct response with pagination metadata
    const response = {
      totalRecords,
      totalPages,
      currentPage: pageNumber,
      pageSize: limitNumber,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
      data: playersWithFilteredRatings,
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;