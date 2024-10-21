const mongoose = require("mongoose");
const { Schema } = mongoose;

const CMSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    },
    Deep_Lying_Playmaker: {
        type: Number,
        required: true
    },
    Central_Midfielder: {
        type: Number,
        required: true
    },
    Advanced_Playmaker: {
        type: Number,
        required: true
    },
    Ball_Winning_Midfielder: {
        type: Number,
        required: true
    },
    Roaming_Playmaker: {
        type: Number,
        required: true
    },
    Box_to_Box_Midfielder: {
        type: Number,
        required: true
    },
    Mezzala: {
        type: Number,
        required: true
    }
}, { collection: 'positions'})

module.exports = mongoose.model("CM", CMSchema);