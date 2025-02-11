const mongoose = require("mongoose");
const { Schema } = mongoose;

const LWSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Advanced_Playmaker_Support: {
        type: Number,
        required: true
    },
    Winger_Support: {
        type: Number,
        required: true
    },
    Winger_Defend: {
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
    Inside_Forward_Attack: {
        type: Number,
        required: true
    }
}, { collection: 'LW'})

module.exports = mongoose.model("LW", LWSchema);