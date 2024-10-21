const mongoose = require("mongoose");
const { Schema } = mongoose;

const RWSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    },
    Defensive_Winger: {
        type: Number,
        required: true
    },
    Wide_Playmaker: {
        type: Number,
        required: true
    },
    Wide_Midfielder: {
        type: Number,
        required: true
    },
    Winger: {
        type: Number,
        required: true
    },
    Inverted_Winger: {
        type: Number,
        required: true
    },
    Raumdeuter: {
        type: Number,
        required: true
    },
    Wide_Target_Man: {
        type: Number,
        required: true
    }
}, { collection: 'positions'})

module.exports = mongoose.model("RW", RWSchema);