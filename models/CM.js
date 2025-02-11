const mongoose = require("mongoose");
const { Schema } = mongoose;

const CMSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Box_To_Box_Midfielder: {
        type: Number,
        required: true
    },
    Carrilero: {
        type: Number,
        required: true
    },
    'Ball_Winning_Midfielder_(Defend)': {
        type: Number,
        required: true
    },
    'Advanced_Playmaker_(Attack)': {
        type: Number,
        required: true
    },
    'Advanced_Playmaker_(Support)': {
        type: Number,
        required: true
    },
    Mezzala: {
        type: Number,
        required: true
    }
}, { collection: 'CM'})

module.exports = mongoose.model("CM", CMSchema);