const mongoose = require("mongoose");
const { Schema } = mongoose;

const AMSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Shadow_Striker: {
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
}, { collection: 'AM' })

module.exports = mongoose.model("AM", AMSchema);