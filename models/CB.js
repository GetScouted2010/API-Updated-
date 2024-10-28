const mongoose = require("mongoose");
const { Schema } = mongoose;

const CBSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    No_Nonsense_Centre_Back: {
        type: Number,
        required: true
    },
    Wide_Centre_Back: {
        type: Number,
        required: true
    },
    Ball_Playing_Defender: {
        type: Number,
        required: true
    },
    Central_Defender: {
        type: Number,
        required: true
    }
}, { collection: 'CB'})

module.exports = mongoose.model("CB", CBSchema);