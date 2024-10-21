const mongoose = require("mongoose");
const { Schema } = mongoose;

const AMSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    },
    Attacking_Midfielder: {
        type: Number,
        required: true
    },
    Advanced_Playmaker: {
        type: Number,
        required: true
    },
    Enganche: {
        type: Number,
        required: true
    },
    Trequartista: {
        type: Number,
        required: true
    }
}, { collection: 'positions' })

module.exports = mongoose.model("AM", AMSchema);