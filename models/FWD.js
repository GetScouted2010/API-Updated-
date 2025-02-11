const mongoose = require("mongoose");
const { Schema } = mongoose;

const FWDSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Deep_Lying_Forward: {
        type: Number,
        required: true
    },
    Target_Forward: {
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
    Advanced_Forward: {
        type: Number,
        required: true
    },
    Pressing_Forward: {
        type: Number,
        required: true
    },
    Trequartista: {
        type: Number,
        required: true
    }
}, { collection: 'FWD'})

module.exports = mongoose.model("FWD", FWDSchema);