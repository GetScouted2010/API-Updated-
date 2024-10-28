const mongoose = require("mongoose");
const { Schema } = mongoose;

const DMSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Anchor_Man: {
        type: Number,
        required: true
    },
    Carrilero: {
        type: Number,
        required: true
    },
    Regista: {
        type: Number,
        required: true
    },
    Segundo_Volante: {
        type: Number,
        required: true
    },
    Half_Back:{
        type: Number,
        required: true
    }
}, { collection: 'DM'})

module.exports = mongoose.model("DM", DMSchema);