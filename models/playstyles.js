const mongoose = require("mongoose");
const { Schema } = mongoose;

const playstyleSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Team: {
        type: String,
        required: true
    },
    Control_Possession: {
        type: Number,
        required: true
    },
    Gegenpressing: {
        type: Number,
        required: true
    },
    Direct_Play: {
        type: Number,
        required: true
    },
    Defensive_Counter_Attacking: {
        type: Number,
        required: true
    },
    Tiki_Taka: {
        type: Number,
        required: true
    },
    Counter_Attack: {
        type: Number,
        required: true
    },
    Wing_Play: {
        type: Number,
        required: true
    },
    Low_Block: {
        type: Number,
        required: true
    }
}, { collection: 'playstyles' })

module.exports = mongoose.model("Playstyles", playstyleSchema);