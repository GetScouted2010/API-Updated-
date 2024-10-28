const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    Total_Score: {
        type: Number,
        ref: 'Player'
    },
    UniqueID: {
        type: Number,
        required: true,
    },
    Player: {
        type: String,
        required: true
    },
    Team: {
        type: String,
        required: true,
    },
    Team_within_selected_timeframe: {
        type: String,
        required: true,
    },
    Positions: {
        type: String,
        required: true,
    },
    Main_Position: {
        type: String,
        required: true,
    },
    Position: {
        type: String,
        required: true,
    },
    Age: {
        type: Number,
        required: true,
    },
    Market_value: {
        type: Number,
        required: true,
    },
    Short_Market_Value: {
        type: Number,
        required: true,
    },
    Contract_expires: {
        type: String,
        required: true,
    },
    Matches_played: {
        type: Number,
        required: true,
    },
    Minutes_played: {
        type: Number,
        required: true,
    },
    Goals: {
        type: Number,
        required: true,
    },
    xG: {
        type: Number,
        required: true,
    },
    Assists: {
        type: Number,
        required: true,
    },
    xA: {
        type: Number,
        required: true,
    },
    Duels_per_90: {
        type: Number,
        required: true,
    },
    Duels_won_percentage: {
        type: Number,
        required: true,
    },
    Birth_country: {
        type: String,
        required: true,
    },
    Passport_country: {
        type: String,
        required: true,
    },
    Foot: {
        type: String,
        required: true,
    },
    Height: {
        type: Number,
        required: true,
    },
    Weight: {
        type: Number,
        required: true,
    },
    On_loan: {
        type: String,
        required: true,
    },
    Successful_defensive_actions_per_90: {
        type: Number,
        required: true,
    },
    Defensive_duels_per_90: {
        type: Number,
        required: true,
    },
    Defensive_duels_won_percentage: {
        type: Number,
        required: true,
    },
    Aerial_duels_per_90: {
        type: Number,
        required: true,
    },
    Aerial_duels_won_percentage: {
        type: Number,
        required: true,
    },
    Sliding_tackles_per_90: {
        type: Number,
        required: true,
    },
    PAdj_Sliding_tackles: {
        type: Number,
        required: true,
    },
    Shots_blocked_per_90: {
        type: Number,
        required: true,
    },
    Interceptions_per_90: {
        type: Number,
        required: true,
    },
    PAdj_Interceptions: {
        type: Number,
        required: true,
    },
    Fouls_per_90: {
        type: Number,
        required: true,
    },
    Yellow_cards: {
        type: Number,
        required: true,
    },
    Yellow_cards_per_90: {
        type: Number,
        required: true,
    },
    Red_cards: {
        type: Number,
        required: true,
    },
    Red_cards_per_90: {
        type: Number,
        required: true,
    },
    Successful_attacking_actions_per_90: {
        type: Number,
        required: true,
    },
    Goals_per_90: {
        type: Number,
        required: true,
    },
    Non_penalty_goals: {
        type: Number,
        required: true,
    },
    Non_penalty_goals_per_90: {
        type: Number,
        required: true,
    },
    xG_per_90: {
        type: Number,
        required: true,
    },
    Head_goals: {
        type: Number,
        required: true,
    },
    Head_goals_per_90: {
        type: Number,
        required: true,
    },
    Shots: {
        type: Number,
        required: true,
    },
    Shots_per_90: {
        type: Number,
        required: true,
    },
    Shots_on_target_percentage: {
        type: Number,
        required: true,
    },
    Goal_conversion_percentage: {
        type: Number,
        required: true,
    },
    Assists_per_90: {
        type: Number,
        required: true,
    },
    Crosses_per_90: {
        type: Number,
        required: true,
    },
    Accurate_crosses_percentage: {
        type: Number,
        required: true,
    },
    Crosses_from_left_flank_per_90: {
        type: Number,
        required: true,
    },
    Accurate_crosses_from_left_flank_percentage: {
        type: Number,
        required: true,
    },
    Crosses_from_right_flank_per_90: {
        type: Number,
        required: true,
    },
    Accurate_crosses_from_right_flank_percentage: {
        type: Number,
        required: true,
    },
    Crosses_to_goalie_box_per_90: {
        type: Number,
        required: true,
    },
    Dribbles_per_90: {
        type: Number,
        required: true,
    },
    Successful_drribles_percentage: {
        type: Number,
        required: true,
    },
    Offensive_duels_per_90: {
        type: Number,
        required: true,
    },
    Offensive_duels_won_percentage: {
        type: Number,
        required: true,
    },
    Touches_in_box_per_90: {
        type: Number,
        required: true,
    },
    Progressive_runs_per_90: {
        type: Number,
        required: true,
    },
    Accelerations_per_90: {
        type: Number,
        required: true,
    },
    Received_passes_per_90: {
        type: Number,
        required: true,
    },
    Received_long_passes_per_90: {
        type: Number,
        required: true,
    },
    Fouls_suffered_per_90: {
        type: Number,
        required: true,
    },
    Passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_passes_percentage: {
        type: Number,
        required: true,
    },
    Forward_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_forward_passes_percentage: {
        type: Number,
        required: true,
    },
    Back_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_back_passes_percentage: {
        type: Number,
        required: true,
    },
    Lateral_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_lateral_passes_percentage: {
        type: Number,
        required: true,
    },
    Short_medium_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_short_medium_passes_percentage: {
        type: Number,
        required: true,
    },
    Long_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_long_passes_percentage: {
        type: Number,
        required: true,
    },
    Average_pass_length_m: {
        type: Number,
        required: true,
    },
    Average_long_pass_length_m: {
        type: Number,
        required: true,
    },
    xA_per_90: {
        type: Number,
        required: true,
    },
    Shot_assists_per_90: {
        type: Number,
        required: true,
    },
    Second_assists_per_90: {
        type: Number,
        required: true,
    },
    Third_assists_per_90:{
        type: Number,
        required: true,
    },
    Smart_passses_per_90:{
        type: Number,
        required: true,
    },
    Accurate_smart_passses_percentage: {
        type: Number,
        required: true,
    },
    Key_passes_per_90: {
        type: Number,
        required: true,
    },
    Passes_to_final_third_per_90: {
        type: Number,
        required: true,
    },
    Accurate_passes_to_final_third_percentage: {
        type: Number,
        required: true,
    },
    Passes_to_penalty_area_per_90: {
        type: Number,
        required: true,
    },
    Accurate_passes_to_penalty_area_percentage: {
        type: Number,
        required: true,
    },
    Through_passes_per_90:{
        type: Number,
        required: true,
    },
    Accurate_through_passes_percentage: {
        type: Number,
        required: true,
    },
    Deep_completions_per_90: {
        type: Number,
        required: true,
    },
    Deep_completed_crosses_per_90: {
        type: Number,
        required: true,
    },
    Progressive_passes_per_90: {
        type: Number,
        required: true,
    },
    Accurate_progressive_passes_percentage: {
        type: Number,
        required: true,
    },
    Conceded_goals: {
        type: Number,
        required: true,
    },
    Conceded_goals_per_90: {
        type: Number,
        required: true,
    },
    Shots_against: {
        type: Number,
        required: true,
    },
    Shots_against_per_90: {
        type: Number,
        required: true,
    },
    Clean_sheets: {
        type: Number,
        required: true,
    },
    Save_rate_percentage: {
        type: Number,
        required: true,
    },
    xG_against: {
        type: Number,
        required: true,
    },
    xG_against_per_90: {
        type: Number,
        required: true,
    },
    Prevented_goals: {
        type: Number,
        required: true,
    },
    Prevented_goals_per_90: {
        type: Number,
        required: true,
    },
    Back_passes_received_as_GK_per_90: {
        type: Number,
        required: true,
    },
    Exits_per_90: {
        type: Number,
        required: true,
    },
    Free_kicks_per_90: {
        type: Number,
        required: true,
    },
    Direct_free_kicks_per_90: {
        type: Number,
        required: true,
    },
    Direct_free_kicks_on_target_percentage: {
        type: Number,
        required: true,
    },
    Corners_per_90: {
        type: Number,
        required: true,
    },
    Penalties_taken: {
        type: Number,
        required: true,
    },
    Penalty_conversion_percentage: {
        type: Number,
        required: true,
    }
});

module.exports = mongoose.model("Player", playerSchema);