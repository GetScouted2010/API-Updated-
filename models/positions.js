const mongoose = require("mongoose");
const { Schema } = mongoose;

const positionSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    }
}, { collection: 'positions'})

module.exports = mongoose.model("positions", positionSchema);