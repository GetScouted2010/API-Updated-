const mongoose = require('mongoose');

const teamPasswordSchema = new mongoose.Schema({
    password: { type: String, required: true },
    team: { type: String, required: true },
    maxUses: { type: Number, required: true, default: 1 }, // Maximum uses allowed
    currentUses: { type: Number, required: true, default: 0 } // How many times used so far
});

module.exports = mongoose.model('TeamPassword', teamPasswordSchema);