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

const { getTransferAverages } = require('./transferRoutes')

const models = { AM, CB, CM, DM, FWD, LB, LW, RB, RW };

const fs = require('fs');
const path = require('path');

// TO DO - Move mapping data to individual files for ease of updating and readability

// Configure Position Mapping
const positionMapping = {
  "AMF": "AM",
  "CB": "CB",
  "CF": "FWD",
  "DMF": "DM",
  "GK": "GK",
  "LAMF": "AM",
  "LB": "LB",
  "LCB": "CB",
  "LCMF": "CM",
  "LDMF": "DM",
  "LW": "LW",
  "LWB": "LW",
  "LWF": "LW",
  "RAMF": "AM",
  "RB": "RB",
  "RCB": "RB",
  "RCMF": "CM",
  "RDMF": "DM",
  "RW": "RW",
  "RWB": "RW",
  "RWF": "RW"
};

// Configure League Mapping
const leagueMapping = {
  "Allsvenskan (Sweden)": ["AIK", "Djurgården", "Elfsborg", "Halmstad", "Häcken", "IFK Göteborg", "IFK Norrköping", "Kalmar", "Malmö FF", "Sirius", "Värnamo", "Västerås SK"],
  "Bundesliga (Austria)": [],
  "Bundesliga (Germany)": ["Augsburg", "Bayer Leverkusen", "Bayern München", "Bochum", "Borussia Dortmund", "Borussia M'gladbach", "Eintracht Frankfurt", "Freiburg", "Heidenheim", "Hoffenheim", "Holstein Kiel", "Mainz 05", "RB Leipzig", "St. Pauli", "Stuttgart", "Union Berlin", "Werder Bremen", "Wolfsburg"],
  "Bundesliga 2": [],
  "Challenger Pro League": [],
  "EFL Championship": ["Blackburn Rovers", "Bristol City", "Cardiff City", "Coventry City", "Derby County", "Hull City", "Millwall", "Middlesbrough", "Norwich City", "Oxford United", "Plymouth Argyle", "Portsmouth", "Preston North End", "Queens Park Rangers", "Sheffield Wednesday", "Stoke City", "Sunderland", "Swansea City", "Watford", "West Bromwich Albion"],
  "EFL League One": [],
  "Eerste Divisie": [],
  "Eliteserien": [],
  "Eredivisie (Netherlands)": ["Ajax", "Almere City", "Feyenoord", "Fortuna Sittard", "Go Ahead Eagles", "Groningen", "Heerenveen", "Heracles", "NAC Breda", "NEC", "PSV", "RKC Waalwijk", "Sparta Rotterdam", "Twente", "Utrecht", "Willem II"],
  "La Liga (Spain)": ["Athletic Bilbao", "Atlético Madrid", "Barcelona", "Celta de Vigo", "Deportivo Alavés", "Espanyol", "Getafe", "Girona", "Las Palmas", "Leganés", "Mallorca", "Osasuna", "Rayo Vallecano", "Real Betis", "Real Madrid", "Real Sociedad", "Real Valladolid", "Sevilla", "Valencia", "Villarreal"],
  "La Liga 2": [],
  "Liga Portugal 2": [],
  "Ligue 1 (France)": ["Angers SCO", "Auxerre", "Brest", "Le Havre", "Lens", "Lille", "Lyon", "Marseille", "Monaco", "Montpellier", "Nantes", "Nice", "PSG", "Reims", "Rennes", "Saint-Étienne", "Strasbourg", "Toulouse"],
  "Ligue 2 (France)": [],
  "MLS (USA)": ["Atlanta United", "Austin FC", "CF Montréal", "Chicago Fire", "Cincinnati", "Colorado Rapids", "Columbus Crew", "Dallas", "Houston Dynamo", "Inter Miami", "LA Galaxy", "Los Angeles FC", "Minnesota United", "Nashville SC", "New England Revolution", "New York City FC", "New York Red Bulls", "Orlando City", "Philadelphia Union", "Portland Timbers", "Real Salt Lake", "San Jose Earthquakes", "Seattle Sounders", "St. Louis City", "Toronto FC", "Vancouver Whitecaps"],
  "Premier League (England)": ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich Town", "Leicester City", "Liverpool", "Luton Town", "Manchester City", "Manchester United", "Newcastle United", "Nottingham Forest", "Sheffield United", "Southampton", "Tottenham Hotspur", "West Ham United", "Wolverhampton Wanderers"],
  "Primeira Liga (Portugal)": ["Arouca", "Benfica", "Boavista", "Casa Pia AC", "Estoril", "Estrela Amadora", "Famalicão", "Farense", "Gil Vicente", "Moreirense", "Porto", "Rio Ave", "Sporting Braga", "Sporting CP", "Vitória Guimarães"],
  "Pro League (Belgium)": ["Anderlecht", "Antwerp", "Club Brugge", "Genk", "Union Saint-Gilloise"],
  "SPL": ["Aberdeen", "Celtic", "Hearts", "Rangers"],
  "Serie A (Brazil)": [],
  "Serie A (Italy)": ["Atalanta", "Bologna", "Cagliari", "Como", "Empoli", "Fiorentina", "Genoa", "Internazionale", "Juventus", "Lazio", "Lecce", "Milan", "Monza", "Napoli", "Parma", "Roma", "Torino", "Udinese", "Venezia"],
  "Serie B": [],
  "Super Lig (Turkey)": [],
  "Superliga (Denmark)": ["AGF", "AaB", "Brøndby", "København", "Lyngby", "Midtjylland", "Nordsjælland", "Randers", "Silkeborg", "SønderjyskE", "Viborg"]
};

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

// Helper function to find the league of a team
const findTeamLeague = (teamName) => {
  for (const [league, teams] of Object.entries(leagueMapping)) {
      if (teams.includes(teamName)) return league;
  }
  return "Unknown League";
};

function getSanitizedFieldName(originalFieldName) {
  return fieldMapping[originalFieldName] || originalFieldName;
}

const calculateFinancialFit = async (teamField, position, playerData) => {
  // Use playerData to determine the team for transfer averages
  let externalData = await getTransferAverages(teamField, null, position);

  let financial_Fit = 'Poor';

  // Financial Fit based on Age and Market Value
  if (playerData.Age >= externalData.Great_Fit.ageMin && playerData.Age <= externalData.Great_Fit.ageMax
    && playerData.Market_value >= (externalData.Great_Fit.marketValueMin * 1000000) && playerData.Market_value <= (externalData.Great_Fit.marketValueMax * 1000000)
  ) {
    financial_Fit = 'Great';
  } else if (playerData.Age >= externalData.Moderate_Fit.ageMin && playerData.Age <= externalData.Moderate_Fit.ageMax
    && playerData.Market_value >= (externalData.Moderate_Fit.marketValueMin * 1000000) && playerData.Market_value <= (externalData.Moderate_Fit.marketValueMax * 1000000)
  ) {
    financial_Fit = 'Moderate';
  }

  return {
    financial_Fit,
    marketValue: externalData.Market_Value,
    age: externalData.Age,
    fee: externalData.Fee_Cleaned
  };
};

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
router.get("/get/:id", verifyToken, async (req, res, next) => {
  const { id } = req.params;
  const csteam = req.query.csteam;
  const user = req.user;
  let score;
  try {
    const found = await Player.findOne({ UniqueID: id });

    if (!found) return next({ status: 404, message: `No Player with the ID: ${id}` });

    // Fetch Compatibility Score
    if (csteam) {
      // Fetch Compatibility Score based on the passed in csteam parameter
      const additionalData = await CompatibilityScores.findOne({ UniqueID: id }).lean();
      score = additionalData ? additionalData[csteam] : null;
    }
    else {
      // Fetch Compatibility Score based on the logged in user's team
      const team = user.team;
      const additionalData = await CompatibilityScores.findOne({ UniqueID: id }).lean();
      score = additionalData ? additionalData[team] : null;
    }

    // Fetch Financial Fit
    let externalData;
    if (csteam) {
      externalData = await getTransferAverages(csteam, null, found.Position)
    }
    else {
      externalData = await getTransferAverages(user.team, null, found.Position)
    }

    let financial_Fit = 'Poor';
    if (found.Age >= externalData.Great_Fit.ageMin && found.Age <= externalData.Great_Fit.ageMax
      && found.Market_value >= (externalData.Great_Fit.marketValueMin * 1000000) && found.Market_value <= (externalData.Great_Fit.marketValueMax * 1000000)
    ) {
      financial_Fit = 'Great';
    }
    else if (found.Age >= externalData.Moderate_Fit.ageMin && found.Age <= externalData.Moderate_Fit.ageMax
      && found.Market_value >= (externalData.Moderate_Fit.marketValueMin * 1000000) && found.Market_value <= (externalData.Moderate_Fit.marketValueMax * 1000000)
    ) {
      financial_Fit = 'Moderate'
    }
    else {
      financial_Fit = 'Poor'
    }

    const transformedResult = {
      _id: found._id,
      UniqueID: found.UniqueID,
      Compatibility_Score: score,
      Financial_Fit: financial_Fit,
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
          $addFields: {
            Combined_Score: {
              $add: ["$Compatibility_Score", "$Total_Score"]
            }
          }
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
          ...(minAgeValue !== null && maxAgeValue !== null && { Age: { $gte: minAgeValue, $lte: maxAgeValue } }),
          // ...(maxAgeValue !== null && { Age: { $lte: maxAgeValue } }),
          ...(minMarketValueValue !== null && maxMarketValueValue !== null && { Market_value: { $gte: minMarketValueValue, $lte: maxMarketValueValue } }),
          // ...(maxMarketValueValue !== null && { Market_value: { $lte: maxMarketValueValue } }),
        },
      },
      {
        $sort: { Combined_Score: -1 }
      }
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
      }
    ];

    // Step 7: Execute pagination query
    const playersWithFilteredRatings = await Player.aggregate(paginatedPipeline);

    // Step 8: Add Financial Fit Data
    const externalData = await getTransferAverages(team, null, selectPosition);

    const financialFitResults = playersWithFilteredRatings.map(record => {
      let financial_Fit = 'Poor';

      if (record.Age >= externalData.Great_Fit.ageMin && record.Age <= externalData.Great_Fit.ageMax
        && record.Market_value >= (externalData.Great_Fit.marketValueMin * 1000000) && record.Market_value <= (externalData.Great_Fit.marketValueMax * 1000000)
      ) {
        financial_Fit = 'Great';
      }
      else if (record.Age >= externalData.Moderate_Fit.ageMin && record.Age <= externalData.Moderate_Fit.ageMax
        && record.Market_value >= (externalData.Moderate_Fit.marketValueMin * 1000000) && record.Market_value <= (externalData.Moderate_Fit.marketValueMax * 1000000)
      ) {
        financial_Fit = 'Moderate'
      }
      else {
        financial_Fit = 'Poor'
      }
      return {
        ...record,
        Financial_Fit: financial_Fit
      }
    });

    // Step 9: Construct response with pagination metadata
    const response = {
      pageInfo: {
        totalRecords,
        totalPages,
        currentPage: pageNumber,
        pageSize: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      data: financialFitResults,
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
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              playerValue: found.Goals_per_90,
              teamValue: roundedAverages.Goals_per_90,
              leagueValue: leagueRoundedAverages.Goals_per_90,
              csteamValue: csteamRoundedAverages.Goals_per_90
            },
            {
              label: "Expected Goals per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              playerValue: found.xG_per_90,
              teamValue: roundedAverages.xG_per_90,
              leagueValue: leagueRoundedAverages.xG_per_90,
              csteamValue: csteamRoundedAverages.xG_per_90
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_per_90,
              teamValue: roundedAverages.Shots_per_90,
              leagueValue: leagueRoundedAverages.Shots_per_90,
              csteamValue: csteamRoundedAverages.Shots_per_90
            },
            {
              label: "Assists per 90",
              player: parseFloat(((found.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              playerValue: found.Assists_per_90,
              teamValue: roundedAverages.Assists_per_90,
              leagueValue: leagueRoundedAverages.Assists_per_90,
              csteamValue: csteamRoundedAverages.Assists_per_90
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage,
              playerValue: found.Successful_dribbles_percentage,
              teamValue: roundedAverages.Successful_dribbles_percentage,
              leagueValue: leagueRoundedAverages.Successful_dribbles_percentage,
              csteamValue: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Progressive runs per 90",
              player: parseFloat(((found.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_runs_per_90 / maxValues.Progressive_runs_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_runs_per_90,
              teamValue: roundedAverages.Progressive_runs_per_90,
              leagueValue: leagueRoundedAverages.Progressive_runs_per_90,
              csteamValue: csteamRoundedAverages.Progressive_runs_per_90
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage,
              playerValue: found.Shots_on_target_percentage,
              teamValue: roundedAverages.Shots_on_target_percentage,
              leagueValue: leagueRoundedAverages.Shots_on_target_percentage,
              csteamValue: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              playerValue: found.Non_penalty_goals_per_90,
              teamValue: roundedAverages.Non_penalty_goals_per_90,
              leagueValue: leagueRoundedAverages.Non_penalty_goals_per_90,
              csteamValue: csteamRoundedAverages.Non_penalty_goals_per_90
            }
          ],
          Defensive: [
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage,
              playerValue: found.Defensive_duels_won_percentage,
              teamValue: roundedAverages.Defensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Sucessful defensive actions per 90",
              player: parseFloat(((found.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Successful_defensive_actions_per_90 / maxValues.Successful_defensive_actions_per_90) * 100).toFixed(2)),
              playerValue: found.Successful_defensive_actions_per_90,
              teamValue: roundedAverages.Successful_defensive_actions_per_90,
              leagueValue: leagueRoundedAverages.Successful_defensive_actions_per_90,
              csteamValue: csteamRoundedAverages.Successful_defensive_actions_per_90
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Fouls per 90",
              player: parseFloat(((found.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Fouls_per_90 / maxValues.Fouls_per_90) * 100).toFixed(2)),
              playerValue: found.Fouls_per_90,
              teamValue: roundedAverages.Fouls_per_90,
              leagueValue: leagueRoundedAverages.Fouls_per_90,
              csteamValue: csteamRoundedAverages.Fouls_per_90
            },
            {
              label: "Sliding tackles per 90",
              player: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              playerValue: found.Sliding_tackles_per_90,
              teamValue: roundedAverages.Sliding_tackles_per_90,
              leagueValue: leagueRoundedAverages.Sliding_tackles_per_90,
              csteamValue: csteamRoundedAverages.Sliding_tackles_per_90
            },
            {
              label: "PAdj Sliding Tackles",
              player: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              playerValue: found.PAdj_Sliding_tackles,
              teamValue: roundedAverages.PAdj_Sliding_tackles,
              leagueValue: leagueRoundedAverages.PAdj_Sliding_tackles,
              csteamValue: csteamRoundedAverages.PAdj_Sliding_tackles
            },
            {
              label: "Shots blocked per 90",
              player: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_blocked_per_90,
              teamValue: roundedAverages.Shots_blocked_per_90,
              leagueValue: leagueRoundedAverages.Shots_blocked_per_90,
              csteamValue: csteamRoundedAverages.Shots_blocked_per_90
            }
          ],
          Passing: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_to_final_third_per_90,
              teamValue: roundedAverages.Passes_to_final_third_per_90,
              leagueValue: leagueRoundedAverages.Passes_to_final_third_per_90,
              csteamValue: csteamRoundedAverages.Passes_to_final_third_per_90
            },
            {
              label: "Smart passes per 90",
              player: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Smart_passes_per_90,
              teamValue: roundedAverages.Smart_passes_per_90,
              leagueValue: leagueRoundedAverages.Smart_passes_per_90,
              csteamValue: csteamRoundedAverages.Smart_passes_per_90
            },
            {
              label: "Through passes per 90",
              player: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Through_passes_per_90,
              teamValue: roundedAverages.Through_passes_per_90,
              leagueValue: leagueRoundedAverages.Through_passes_per_90,
              csteamValue: csteamRoundedAverages.Through_passes_per_90
            },
            {
              label: "Passes to penalty area per 90",
              player: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_to_penalty_area_per_90,
              teamValue: roundedAverages.Passes_to_penalty_area_per_90,
              leagueValue: leagueRoundedAverages.Passes_to_penalty_area_per_90,
              csteamValue: csteamRoundedAverages.Passes_to_penalty_area_per_90
            },
            {
              label: "Accurate passes to final third %",
              player: found.Accurate_passes_to_final_third_percentage,
              team: roundedAverages.Accurate_passes_to_final_third_percentage,
              league: leagueRoundedAverages.Accurate_passes_to_final_third_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_to_final_third_percentage,
              playerValue: found.Accurate_passes_to_final_third_percentage,
              teamValue: roundedAverages.Accurate_passes_to_final_third_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_to_final_third_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_to_final_third_percentage
            },
            {
              label: "Accurate through passes %",
              player: found.Accurate_through_passes_percentage,
              team: roundedAverages.Accurate_through_passes_percentage,
              league: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_through_passes_percentage,
              playerValue: found.Accurate_through_passes_percentage,
              teamValue: roundedAverages.Accurate_through_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_through_passes_percentage
            }
          ],
          Duels: [
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Offensive_duels_per_90,
              teamValue: roundedAverages.Offensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Offensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Offensive_duels_per_90
            },
            {
              label: "Offensive duels won %",
              player: found.Offensive_duels_won_percentage,
              team: roundedAverages.Offensive_duels_won_percentage,
              league: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Offensive_duels_won_percentage,
              playerValue: found.Offensive_duels_won_percentage,
              teamValue: roundedAverages.Offensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Offensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
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
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
            }
          ],
          Defensive: [
            {
              label: "Save rate %",
              player: found.Save_rate_percentage,
              team: roundedAverages.Save_rate_percentage,
              league: leagueRoundedAverages.Save_rate_percentage,
              csteam: csteamRoundedAverages.Save_rate_percentage,
              playerValue: found.Save_rate_percentage,
              teamValue: roundedAverages.Save_rate_percentage,
              leagueValue: leagueRoundedAverages.Save_rate_percentage,
              csteamValue: csteamRoundedAverages.Save_rate_percentage
            },
            {
              label: "Conceded goals per 90",
              player: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              playerValue: found.Conceded_goals_per_90,
              teamValue: roundedAverages.Conceded_goals_per_90,
              leagueValue: leagueRoundedAverages.Conceded_goals_per_90,
              csteamValue: csteamRoundedAverages.Conceded_goals_per_90
            },
            {
              label: "Shots against per 90",
              player: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_against_per_90,
              teamValue: roundedAverages.Shots_against_per_90,
              leagueValue: leagueRoundedAverages.Shots_against_per_90,
              csteamValue: csteamRoundedAverages.Shots_against_per_90
            },
            {
              label: "Clean sheets",
              player: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              playerValue: found.Clean_sheets,
              teamValue: roundedAverages.Clean_sheets,
              leagueValue: leagueRoundedAverages.Clean_sheets,
              csteamValue: csteamRoundedAverages.Clean_sheets
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
            }
          ],
          Passing: [
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_to_final_third_per_90,
              teamValue: roundedAverages.Passes_to_final_third_per_90,
              leagueValue: leagueRoundedAverages.Passes_to_final_third_per_90,
              csteamValue: csteamRoundedAverages.Passes_to_final_third_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
            }
          ],
          Duels: [
            {
              label: "Duels per 90",
              player: parseFloat(((found.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Duels_per_90 / maxValues.Duels_per_90) * 100).toFixed(2)),
              playerValue: found.Duels_per_90,
              teamValue: roundedAverages.Duels_per_90,
              leagueValue: leagueRoundedAverages.Duels_per_90,
              csteamValue: csteamRoundedAverages.Duels_per_90
            },
            {
              label: "Duels won %",
              player: found.Duels_won_percentage,
              team: roundedAverages.Duels_won_percentage,
              league: leagueRoundedAverages.Duels_won_percentage,
              csteam: csteamRoundedAverages.Duels_won_percentage,
              playerValue: found.Duels_won_percentage,
              teamValue: roundedAverages.Duels_won_percentage,
              leagueValue: leagueRoundedAverages.Duels_won_percentage,
              csteamValue: csteamRoundedAverages.Duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
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
              csteam: csteamRoundedAverages.Save_rate_percentage,
              playerValue: found.Save_rate_percentage,
              teamValue: roundedAverages.Save_rate_percentage,
              leagueValue: leagueRoundedAverages.Save_rate_percentage,
              csteamValue: csteamRoundedAverages.Save_rate_percentage
            },
            {
              label: "Conceded goals per 90",
              player: parseFloat(((found.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Conceded_goals_per_90 / maxValues.Conceded_goals_per_90) * 100).toFixed(2)),
              playerValue: found.Conceded_goals_per_90,
              teamValue: roundedAverages.Conceded_goals_per_90,
              leagueValue: leagueRoundedAverages.Conceded_goals_per_90,
              csteamValue: csteamRoundedAverages.Conceded_goals_per_90
            },
            {
              label: "Shots against per 90",
              player: parseFloat(((found.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_against_per_90 / maxValues.Shots_against_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_against_per_90,
              teamValue: roundedAverages.Shots_against_per_90,
              leagueValue: leagueRoundedAverages.Shots_against_per_90,
              csteamValue: csteamRoundedAverages.Shots_against_per_90
            },
            {
              label: "Clean sheets",
              player: parseFloat(((found.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Clean_sheets / maxValues.Clean_sheets) * 100).toFixed(2)),
              playerValue: found.Clean_sheets,
              teamValue: roundedAverages.Clean_sheets,
              leagueValue: leagueRoundedAverages.Clean_sheets,
              csteamValue: csteamRoundedAverages.Clean_sheets
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage,
              playerValue: found.Defensive_duels_won_percentage,
              teamValue: roundedAverages.Defensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage,
              playerValue: found.Successful_dribbles_percentage,
              teamValue: roundedAverages.Successful_dribbles_percentage,
              leagueValue: leagueRoundedAverages.Successful_dribbles_percentage,
              csteamValue: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Crosses per 90",
              player: parseFloat(((found.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              playerValue: found.Crosses_per_90,
              teamValue: roundedAverages.Crosses_per_90,
              leagueValue: leagueRoundedAverages.Crosses_per_90,
              csteamValue: csteamRoundedAverages.Crosses_per_90
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage,
              playerValue: found.Accurate_crosses_percentage,
              teamValue: roundedAverages.Accurate_crosses_percentage,
              leagueValue: leagueRoundedAverages.Accurate_crosses_percentage,
              csteamValue: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              playerValue: found.Touches_in_box_per_90,
              teamValue: roundedAverages.Touches_in_box_per_90,
              leagueValue: leagueRoundedAverages.Touches_in_box_per_90,
              csteamValue: csteamRoundedAverages.Touches_in_box_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage,
              playerValue: found.Defensive_duels_won_percentage,
              teamValue: roundedAverages.Defensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
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
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage,
              playerValue: found.Defensive_duels_won_percentage,
              teamValue: roundedAverages.Defensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Interceptions per 90",
              player: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              team: parseFloat(((found.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Assists_per_90 / maxValues.Assists_per_90) * 100).toFixed(2)),
              playerValue: found.Assists_per_90,
              teamValue: roundedAverages.Assists_per_90,
              leagueValue: leagueRoundedAverages.Assists_per_90,
              csteamValue: csteamRoundedAverages.Assists_per_90
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_per_90,
              teamValue: roundedAverages.Shots_per_90,
              leagueValue: leagueRoundedAverages.Shots_per_90,
              csteamValue: csteamRoundedAverages.Shots_per_90
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              playerValue: found.xG_per_90,
              teamValue: roundedAverages.xG_per_90,
              leagueValue: leagueRoundedAverages.xG_per_90,
              csteamValue: csteamRoundedAverages.xG_per_90
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage,
              playerValue: found.Successful_dribbles_percentage,
              teamValue: roundedAverages.Successful_dribbles_percentage,
              leagueValue: leagueRoundedAverages.Successful_dribbles_percentage,
              csteamValue: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Pass completion %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
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
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              playerValue: found.Crosses_per_90,
              teamValue: roundedAverages.Crosses_per_90,
              leagueValue: leagueRoundedAverages.Crosses_per_90,
              csteamValue: csteamRoundedAverages.Crosses_per_90
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage,
              playerValue: found.Accurate_crosses_percentage,
              teamValue: roundedAverages.Accurate_crosses_percentage,
              leagueValue: leagueRoundedAverages.Accurate_crosses_percentage,
              csteamValue: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage,
              playerValue: found.Successful_dribbles_percentage,
              teamValue: roundedAverages.Successful_dribbles_percentage,
              leagueValue: leagueRoundedAverages.Successful_dribbles_percentage,
              csteamValue: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Offensive_duels_per_90,
              teamValue: roundedAverages.Offensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Offensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Offensive_duels_per_90
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              playerValue: found.Touches_in_box_per_90,
              teamValue: roundedAverages.Touches_in_box_per_90,
              leagueValue: leagueRoundedAverages.Touches_in_box_per_90,
              csteamValue: csteamRoundedAverages.Touches_in_box_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Crosses_per_90 / maxValues.Crosses_per_90) * 100).toFixed(2)),
              playerValue: found.Crosses_per_90,
              teamValue: roundedAverages.Crosses_per_90,
              leagueValue: leagueRoundedAverages.Crosses_per_90,
              csteamValue: csteamRoundedAverages.Crosses_per_90
            },
            {
              label: "Accurate crosses %",
              player: found.Accurate_crosses_percentage,
              team: roundedAverages.Accurate_crosses_percentage,
              league: leagueRoundedAverages.Accurate_crosses_percentage,
              csteam: csteamRoundedAverages.Accurate_crosses_percentage,
              playerValue: found.Accurate_crosses_percentage,
              teamValue: roundedAverages.Accurate_crosses_percentage,
              leagueValue: leagueRoundedAverages.Accurate_crosses_percentage,
              csteamValue: csteamRoundedAverages.Accurate_crosses_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Successful dribbles %",
              player: found.Successful_dribbles_percentage,
              team: roundedAverages.Successful_dribbles_percentage,
              league: leagueRoundedAverages.Successful_dribbles_percentage,
              csteam: csteamRoundedAverages.Successful_dribbles_percentage,
              playerValue: found.Successful_dribbles_percentage,
              teamValue: roundedAverages.Successful_dribbles_percentage,
              leagueValue: leagueRoundedAverages.Successful_dribbles_percentage,
              csteamValue: csteamRoundedAverages.Successful_dribbles_percentage
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Offensive_duels_per_90,
              teamValue: roundedAverages.Offensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Offensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Offensive_duels_per_90
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              playerValue: found.Touches_in_box_per_90,
              teamValue: roundedAverages.Touches_in_box_per_90,
              leagueValue: leagueRoundedAverages.Touches_in_box_per_90,
              csteamValue: csteamRoundedAverages.Touches_in_box_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              playerValue: found.Goals_per_90,
              teamValue: roundedAverages.Goals_per_90,
              leagueValue: leagueRoundedAverages.Goals_per_90,
              csteamValue: csteamRoundedAverages.Goals_per_90
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_per_90,
              teamValue: roundedAverages.Shots_per_90,
              leagueValue: leagueRoundedAverages.Shots_per_90,
              csteamValue: csteamRoundedAverages.Shots_per_90
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage,
              playerValue: found.Shots_on_target_percentage,
              teamValue: roundedAverages.Shots_on_target_percentage,
              leagueValue: leagueRoundedAverages.Shots_on_target_percentage,
              csteamValue: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              playerValue: found.xG_per_90,
              teamValue: roundedAverages.xG_per_90,
              leagueValue: leagueRoundedAverages.xG_per_90,
              csteamValue: csteamRoundedAverages.xG_per_90
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Offensive_duels_per_90,
              teamValue: roundedAverages.Offensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Offensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Offensive_duels_per_90
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              playerValue: found.Non_penalty_goals_per_90,
              teamValue: roundedAverages.Non_penalty_goals_per_90,
              leagueValue: leagueRoundedAverages.Non_penalty_goals_per_90,
              csteamValue: csteamRoundedAverages.Non_penalty_goals_per_90
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
              csteam: parseFloat(((csteamRoundedAverages.Goals_per_90 / maxValues.Goals_per_90) * 100).toFixed(2)),
              playerValue: found.Goals_per_90,
              teamValue: roundedAverages.Goals_per_90,
              leagueValue: leagueRoundedAverages.Goals_per_90,
              csteamValue: csteamRoundedAverages.Goals_per_90
            },
            {
              label: "Non-penalty goals per 90",
              player: parseFloat(((found.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Non_penalty_goals_per_90 / maxValues.Non_penalty_goals_per_90) * 100).toFixed(2)),
              playerValue: found.Non_penalty_goals_per_90,
              teamValue: roundedAverages.Non_penalty_goals_per_90,
              leagueValue: leagueRoundedAverages.Non_penalty_goals_per_90,
              csteamValue: csteamRoundedAverages.Non_penalty_goals_per_90
            },
            {
              label: "xG per 90",
              player: parseFloat(((found.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.xG_per_90 / maxValues.xG_per_90) * 100).toFixed(2)),
              playerValue: found.xG_per_90,
              teamValue: roundedAverages.xG_per_90,
              leagueValue: leagueRoundedAverages.xG_per_90,
              csteamValue: csteamRoundedAverages.xG_per_90
            },
            {
              label: "Shots per 90",
              player: parseFloat(((found.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_per_90 / maxValues.Shots_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_per_90,
              teamValue: roundedAverages.Shots_per_90,
              leagueValue: leagueRoundedAverages.Shots_per_90,
              csteamValue: csteamRoundedAverages.Shots_per_90
            },
            {
              label: "Shots on target %",
              player: found.Shots_on_target_percentage,
              team: roundedAverages.Shots_on_target_percentage,
              league: leagueRoundedAverages.Shots_on_target_percentage,
              csteam: csteamRoundedAverages.Shots_on_target_percentage,
              playerValue: found.Shots_on_target_percentage,
              teamValue: roundedAverages.Shots_on_target_percentage,
              leagueValue: leagueRoundedAverages.Shots_on_target_percentage,
              csteamValue: csteamRoundedAverages.Shots_on_target_percentage
            },
            {
              label: "Goal conversion %",
              player: found.Goal_conversion_percentage,
              team: roundedAverages.Goal_conversion_percentage,
              league: leagueRoundedAverages.Goal_conversion_percentage,
              csteam: csteamRoundedAverages.Goal_conversion_percentage,
              playerValue: found.Goal_conversion_percentage,
              teamValue: roundedAverages.Goal_conversion_percentage,
              leagueValue: leagueRoundedAverages.Goal_conversion_percentage,
              csteamValue: csteamRoundedAverages.Goal_conversion_percentage
            },
            {
              label: "Dribbles per 90",
              player: parseFloat(((found.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Dribbles_per_90 / maxValues.Dribbles_per_90) * 100).toFixed(2)),
              playerValue: found.Dribbles_per_90,
              teamValue: roundedAverages.Dribbles_per_90,
              leagueValue: leagueRoundedAverages.Dribbles_per_90,
              csteamValue: csteamRoundedAverages.Dribbles_per_90
            },
            {
              label: "Offensive duels per 90",
              player: parseFloat(((found.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Offensive_duels_per_90 / maxValues.Offensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Offensive_duels_per_90,
              teamValue: roundedAverages.Offensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Offensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Offensive_duels_per_90
            },
            {
              label: "Offensive duels won %",
              player: found.Offensive_duels_won_percentage,
              team: roundedAverages.Offensive_duels_won_percentage,
              league: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Offensive_duels_won_percentage,
              playerValue: found.Offensive_duels_won_percentage,
              teamValue: roundedAverages.Offensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Offensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Offensive_duels_won_percentage
            },
            {
              label: "Touches in box per 90",
              player: parseFloat(((found.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Touches_in_box_per_90 / maxValues.Touches_in_box_per_90) * 100).toFixed(2)),
              playerValue: found.Touches_in_box_per_90,
              teamValue: roundedAverages.Touches_in_box_per_90,
              leagueValue: leagueRoundedAverages.Touches_in_box_per_90,
              csteamValue: csteamRoundedAverages.Touches_in_box_per_90
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
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Passes per 90",
              player: parseFloat(((found.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_per_90 / maxValues.Passes_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_per_90,
              teamValue: roundedAverages.Passes_per_90,
              leagueValue: leagueRoundedAverages.Passes_per_90,
              csteamValue: csteamRoundedAverages.Passes_per_90
            },
            {
              label: "Progressive passes per 90",
              player: parseFloat(((found.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Progressive_passes_per_90 / maxValues.Progressive_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Progressive_passes_per_90,
              teamValue: roundedAverages.Progressive_passes_per_90,
              leagueValue: leagueRoundedAverages.Progressive_passes_per_90,
              csteamValue: csteamRoundedAverages.Progressive_passes_per_90
            },
            {
              label: "Key passes per 90",
              player: parseFloat(((found.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Key_passes_per_90 / maxValues.Key_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Key_passes_per_90,
              teamValue: roundedAverages.Key_passes_per_90,
              leagueValue: leagueRoundedAverages.Key_passes_per_90,
              csteamValue: csteamRoundedAverages.Key_passes_per_90
            },
            {
              label: "Passes to final third per 90",
              player: parseFloat(((found.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_final_third_per_90 / maxValues.Passes_to_final_third_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_to_final_third_per_90,
              teamValue: roundedAverages.Passes_to_final_third_per_90,
              leagueValue: leagueRoundedAverages.Passes_to_final_third_per_90,
              csteamValue: csteamRoundedAverages.Passes_to_final_third_per_90
            },
            {
              label: "Passes to penalty area per 90",
              player: parseFloat(((found.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Passes_to_penalty_area_per_90 / maxValues.Passes_to_penalty_area_per_90) * 100).toFixed(2)),
              playerValue: found.Passes_to_penalty_area_per_90,
              teamValue: roundedAverages.Passes_to_penalty_area_per_90,
              leagueValue: leagueRoundedAverages.Passes_to_penalty_area_per_90,
              csteamValue: csteamRoundedAverages.Passes_to_penalty_area_per_90
            },
            {
              label: "Accurate passes to final third %",
              player: found.Accurate_passes_percentage,
              team: roundedAverages.Accurate_passes_percentage,
              league: leagueRoundedAverages.Accurate_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_passes_percentage,
              playerValue: found.Accurate_passes_percentage,
              teamValue: roundedAverages.Accurate_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_passes_percentage
            },
            {
              label: "Smart passes per 90",
              player: parseFloat(((found.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Smart_passes_per_90 / maxValues.Smart_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Smart_passes_per_90,
              teamValue: roundedAverages.Smart_passes_per_90,
              leagueValue: leagueRoundedAverages.Smart_passes_per_90,
              csteamValue: csteamRoundedAverages.Smart_passes_per_90
            },
            {
              label: "Through passes per 90",
              player: parseFloat(((found.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Through_passes_per_90 / maxValues.Through_passes_per_90) * 100).toFixed(2)),
              playerValue: found.Through_passes_per_90,
              teamValue: roundedAverages.Through_passes_per_90,
              leagueValue: leagueRoundedAverages.Through_passes_per_90,
              csteamValue: csteamRoundedAverages.Through_passes_per_90
            },
            {
              label: "Accurate through passes %",
              player: found.Accurate_through_passes_percentage,
              team: roundedAverages.Accurate_through_passes_percentage,
              league: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteam: csteamRoundedAverages.Accurate_through_passes_percentage,
              playerValue: found.Accurate_through_passes_percentage,
              teamValue: roundedAverages.Accurate_through_passes_percentage,
              leagueValue: leagueRoundedAverages.Accurate_through_passes_percentage,
              csteamValue: csteamRoundedAverages.Accurate_through_passes_percentage
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
              csteam: parseFloat(((csteamRoundedAverages.Interceptions_per_90 / maxValues.Interceptions_per_90) * 100).toFixed(2)),
              playerValue: found.Interceptions_per_90,
              teamValue: roundedAverages.Interceptions_per_90,
              leagueValue: leagueRoundedAverages.Interceptions_per_90,
              csteamValue: csteamRoundedAverages.Interceptions_per_90
            },
            {
              label: "Defensive duels per 90",
              player: parseFloat(((found.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Defensive_duels_per_90 / maxValues.Defensive_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Defensive_duels_per_90,
              teamValue: roundedAverages.Defensive_duels_per_90,
              leagueValue: leagueRoundedAverages.Defensive_duels_per_90,
              csteamValue: csteamRoundedAverages.Defensive_duels_per_90
            },
            {
              label: "Defensive duels won %",
              player: found.Defensive_duels_won_percentage,
              team: roundedAverages.Defensive_duels_won_percentage,
              league: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteam: csteamRoundedAverages.Defensive_duels_won_percentage,
              playerValue: found.Defensive_duels_won_percentage,
              teamValue: roundedAverages.Defensive_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Defensive_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Defensive_duels_won_percentage
            },
            {
              label: "Aerial duels per 90",
              player: parseFloat(((found.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Aerial_duels_per_90 / maxValues.Aerial_duels_per_90) * 100).toFixed(2)),
              playerValue: found.Aerial_duels_per_90,
              teamValue: roundedAverages.Aerial_duels_per_90,
              leagueValue: leagueRoundedAverages.Aerial_duels_per_90,
              csteamValue: csteamRoundedAverages.Aerial_duels_per_90
            },
            {
              label: "Aerial duels won %",
              player: found.Aerial_duels_won_percentage,
              team: roundedAverages.Aerial_duels_won_percentage,
              league: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteam: csteamRoundedAverages.Aerial_duels_won_percentage,
              playerValue: found.Aerial_duels_won_percentage,
              teamValue: roundedAverages.Aerial_duels_won_percentage,
              leagueValue: leagueRoundedAverages.Aerial_duels_won_percentage,
              csteamValue: csteamRoundedAverages.Aerial_duels_won_percentage
            },
            {
              label: "Shots blocked per 90",
              player: parseFloat(((found.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Shots_blocked_per_90 / maxValues.Shots_blocked_per_90) * 100).toFixed(2)),
              playerValue: found.Shots_blocked_per_90,
              teamValue: roundedAverages.Shots_blocked_per_90,
              leagueValue: leagueRoundedAverages.Shots_blocked_per_90,
              csteamValue: csteamRoundedAverages.Shots_blocked_per_90
            },
            {
              label: "Sliding tackles per 90",
              player: parseFloat(((found.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.Sliding_tackles_per_90 / maxValues.Sliding_tackles_per_90) * 100).toFixed(2)),
              playerValue: found.Sliding_tackles_per_90,
              teamValue: roundedAverages.Sliding_tackles_per_90,
              leagueValue: leagueRoundedAverages.Sliding_tackles_per_90,
              csteamValue: csteamRoundedAverages.Sliding_tackles_per_90
            },
            {
              label: "PAdj Sliding tackles",
              player: parseFloat(((found.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              team: parseFloat(((roundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              league: parseFloat(((leagueRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              csteam: parseFloat(((csteamRoundedAverages.PAdj_Sliding_tackles / maxValues.PAdj_Sliding_tackles) * 100).toFixed(2)),
              playerValue: found.PAdj_Sliding_tackles,
              teamValue: roundedAverages.PAdj_Sliding_tackles,
              leagueValue: leagueRoundedAverages.PAdj_Sliding_tackles,
              csteamValue: csteamRoundedAverages.PAdj_Sliding_tackles
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

// GET route to fetch all playable Positions for a particular player
router.get('/get/:id/positions', verifyToken, async (req, res) => {
  try {
    // Step 1: Get the UniqueID from the request parameters
    const playerId = req.params.id;

    // Step 2: Fetch the player data from MongoDB
    const player = await Player.findOne({ UniqueID: playerId });

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Step 3: Check if Positions is a string, then split it into an array
    let positions = player.Positions;

    // If Positions is a string, split it by commas and trim spaces
    if (typeof positions === 'string') {
      positions = positions.split(',').map(position => position.trim()); // Split and trim spaces
    }

    // Ensure positions is an array
    if (!Array.isArray(positions)) {
      return res.status(400).json({ message: "Positions is not in a valid format" });
    }

    // Step 4: Simplify the Positions field using the positionMapping
    const simplifiedPositions = positions
      .map(position => positionMapping[position])  // Map detailed positions to simplified ones
      .filter((value, index, self) => value && self.indexOf(value) === index);  // Remove duplicates

    // Step 5: Send the response
    res.json(simplifiedPositions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

router.get('/get/:id/compatibility', verifyToken, async (req, res) => {
  try {
    // Step 1: Get the UniqueID from the request parameters
    const playerId = req.params.id;

    // Step 2: Fetch the player compatibility scores from the database
    const compatibilityRecord = await CompatibilityScores.findOne({ UniqueID: playerId });

    if (!compatibilityRecord) {
      return res.status(404).json({ message: "Compatibility scores not found" });
    }

    // Step 3: Fetch the player record to get Age and Market_value (to pass to calculateFinancialFit)
    const playerRecord = await Player.findOne({ UniqueID: playerId });

    if (!playerRecord) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Step 4: Default Position Logic
    const position = req.query.Position || compatibilityRecord.Position; // Use query param Position or fallback to Player's Position

    // Step 5: Extract all team-related fields and sort them by value
    const teams = Object.keys(compatibilityRecord.toObject()) // Convert to a plain object and extract keys
      .filter(field => field !== "UniqueID" && field !== "_id" && field !== "Position") // Exclude the UniqueID, _id, and Position fields
      .map(field => ({ name: field, value: compatibilityRecord[field] })) // Create an array of {team, score}
      .sort((a, b) => b.value - a.value); // Sort in descending order of compatibility score

    // Step 6: Extract query parameters (minAge, maxAge, League, Financial_Fit, etc.)
    const { minAge, maxAge, minMarketValue, maxMarketValue, minFee, maxFee, Financial_Fit } = req.query;
    const leagueFilter = req.query.League ? req.query.League.split(',') : null;

    // Define allowed financial fit values based on the filter
    const financialFitMapping = {
      "Great": ["Great"],
      "Moderate": ["Great", "Moderate"],
      "Poor": ["Great", "Moderate", "Poor"]
    };

    const allowedFinancialFits = financialFitMapping[Financial_Fit] || ["Great", "Moderate", "Poor"];

    // Step 7: Process each team
    const processedTeams = [];
    for (let team of teams) {
      const { name, value } = team;

      // Get the original team name using the helper function
      const originalTeamName = getOriginalFieldName(name);

      // Find the league for the team
      const teamLeague = findTeamLeague(originalTeamName);

      // Get external data for the team and calculate Financial Fit
      const externalData = await calculateFinancialFit(originalTeamName, position, playerRecord);

      // Check if the team meets the filters set by the user
      const meetsFilters = (
        (minAge ? externalData.age.avg >= minAge : true) &&
        (maxAge ? externalData.age.avg <= maxAge : true) &&
        (minMarketValue ? externalData.marketValue.avg >= minMarketValue : true) &&
        (maxMarketValue ? externalData.marketValue.avg <= maxMarketValue : true) &&
        (minFee ? externalData.fee.avg >= minFee : true) &&
        (maxFee ? externalData.fee.avg <= maxFee : true)
      );

      // Check if the team is in the allowed leagues
      const inAllowedLeague = !leagueFilter || leagueFilter.includes(teamLeague);

      // Check if the Financial Fit matches the allowed values
      const inAllowedFinancialFit = allowedFinancialFits.includes(externalData.financial_Fit);

      if (meetsFilters && inAllowedLeague && inAllowedFinancialFit) {
        processedTeams.push({
          Team: originalTeamName, // Return the formatted team name
          League: teamLeague,
          Compatibility_Score: value,
          Financial_Fit: externalData.financial_Fit,
          Market_Value: externalData.marketValue,
          Age: externalData.age,
          Fee: externalData.fee
        });
      }
    }

    // Step 8: Return the processed teams
    res.json(processedTeams);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

router.get('/compatibilityLeagues', verifyToken, async (req, res) => {
  const leaguesWithTeams = Object.keys(leagueMapping).filter(league => leagueMapping[league].length > 0);
  res.json(leaguesWithTeams);
});

module.exports = router;