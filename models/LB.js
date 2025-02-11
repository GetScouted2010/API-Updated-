const mongoose = require("mongoose");
const { Schema } = mongoose;

const LBSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    No_Nonsense_Full_Back: {
        type: Number,
        required: true
    },
    Full_Back: {
        type: Number,
        required: true
    },
    Complete_Wing_Back: {
        type: Number,
        required: true
    },
    Wing_Back: {
        type: Number,
        required: true
    },
    Inverted_Wing_Back: {
        type: Number,
        required: true
    },
    Inverted_Full_Back: {
        type: Number,
        required: true
    }
}, { collection: 'LB'})

module.exports = mongoose.model("LB", LBSchema);