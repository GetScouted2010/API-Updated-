const mongoose = require("mongoose");
const { Schema } = mongoose;

const shortlistSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    listName: {
        type: String,
        required: true
    },
    shortlist: {
        type: [Schema.Types.ObjectId],
        ref: 'Player',
        default: []
    }
}, { collection: 'shortlist' })

module.exports = mongoose.model("shortlist", shortlistSchema);