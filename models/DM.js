const mongoose = require("mongoose");
const { Schema } = mongoose;

const DMSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Regista: {
        type: Number,
        required: true
    },
    Deep_Lying_Playmaker: {
        type: Number,
        required: true
    },
    Half_Back: {
        type: Number,
        required: true
    },
    Anchor: {
        type: Number,
        required: true
    },
    Segundo_Volante:{
        type: Number,
        required: true
    },
    Ball_Winning_Midfielder:{
        type: Number,
        required: true
    },
    Roaming_Playmaker:{
        type: Number,
        required: true
    },

}, { collection: 'DM'})

module.exports = mongoose.model("DM", DMSchema);