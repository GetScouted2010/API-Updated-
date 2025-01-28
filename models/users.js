const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    // fullname: {
    //     type: String,
    //     required: true
    // },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    team: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
}, { collection: 'users' })

module.exports = mongoose.model("users", userSchema);