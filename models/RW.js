const mongoose = require("mongoose");
const { Schema } = mongoose;

const RWSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Winger_Support: {
        type: Number,
        required: true
    },
    Inverted_Winger: {
        type: Number,
        required: true
    },
    Advanced_Playmaker_Attack: {
        type: Number,
        required: true
    },
    Inside_Forward: {
        type: Number,
        required: true
    },
    Winger_Defend: {
        type: Number,
        required: true
    },
    Advanced_Playmaker_Support: {
        type: Number,
        required: true
    }
}, { collection: 'RW'})

module.exports = mongoose.model("RW", RWSchema);