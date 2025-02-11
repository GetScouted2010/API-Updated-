const mongoose = require("mongoose");
const { Schema } = mongoose;

const CBSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    'Wide_Centre_Back_(LCB)': {
        type: Number,
        required: true
    },
    No_Nonsense_Centre_Back: {
        type: Number,
        required: true
    },
    'Wide_Centre_Back_(RCB)': {
        type: Number,
        required: true
    },
    Libero: {
        type: Number,
        required: true
    }
}, { collection: 'CB'})

module.exports = mongoose.model("CB", CBSchema);