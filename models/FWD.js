const mongoose = require("mongoose");
const { Schema } = mongoose;

const FWDSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    },
    Advanced_Forward: {
        type: Number,
        required: true
    },
    Poacher: {
        type: Number,
        required: true
    },
    Complete_Forward: {
        type: Number,
        required: true
    },
    Pressing_Forward: {
        type: Number,
        required: true
    },
    Target_Man: {
        type: Number,
        required: true
    },
    Shadow_Striker: {
        type: Number,
        required: true
    },
    Deep_Lying_Forward: {
        type: Number,
        required: true
    }
}, { collection: 'positions'})

module.exports = mongoose.model("FWD", FWDSchema);