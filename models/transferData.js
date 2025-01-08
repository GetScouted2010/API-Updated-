const mongoose = require("mongoose");
const { Schema } = mongoose;

const transferDataSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Player: {
        type: String,
        required: true
    },
    Age: {
        type: Number,
        required: true
    },
    Nationality: {
        type: String,
        required: true
    },
    Position: {
        type: String,
        required: true
    },
    Short_Position: {
        type: String,
        required: true
    },
    Market_Value: {
        type: Number,
        required: true
    },
    Dealing_Club: {
        type: String,
        required: true
    },
    Dealing_Country: {
        type: String,
        required: true
    },
    Fee: {
        type: Number,
        required: true
    },
    Movement: {
        type: String,
        required: true
    },
    Window: {
        type: String,
        required: true
    },
    League_Name: {
        type: String,
        required: true
    },
    Year: {
        type: Number,
        required: true
    },
    is_loan: {
        type: Boolean,
        required: true
    },
    loan_status: {
        type: Schema.Types.Mixed,
        required: true
    }
}, { collection: 'transferdata'})

module.exports = mongoose.model("TransferData", transferDataSchema);