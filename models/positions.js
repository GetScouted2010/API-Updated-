const mongoose = require("mongoose");
const { Schema } = mongoose;

const positionSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    }
}, { collection: 'positions'})

module.exports = mongoose.model("positions", positionSchema);