const mongoose = require("mongoose");
const { Schema } = mongoose;

const compatabilityScoresSchema = new Schema({
    UniqueID: {
        type: Number,
        required: true
    },
    Almería: {
        type: Number,
        required: true
    },
    Position: {
        type: Number,
        required: true
    },
    Arsenal: {
        type: Number,
        required: true
    },
    "Aston Villa": {
        type: Number,
        required: true
    },
    Atalanta: {
        type: Number,
        required: true
    },
    "Athletic Bilbao": {
        type: Number,
        required: true
    },
    "Atlético Madrid": {
        type: Number,
        required: true
    },
    Augsburg: {
        type: Number,
        required: true
    },
    Barcelona: {
        type: Number,
        required: true
    },
    "Bayer Leverkusen": {
        type: Number,
        required: true
    },
    "Bayern München": {
        type: Number,
        required: true
    },
    Bochum: {
        type: Number,
        required: true
    },
    Bologna: {
        type: Number,
        required: true
    },
    "Borussia Dortmund": {
        type: Number,
        required: true
    },
    "Borussia M_gladbach": {
        type: Number,
        required: true
    },
    Bournemouth: {
        type: Number,
        required: true
    },
    Brentford: {
        type: Number,
        required: true
    },
    Brest: {
        type: Number,
        required: true
    },
    Brighton: {
        type: Number,
        required: true
    },
    Burnley: {
        type: Number,
        required: true
    },
    Cagliari: {
        type: Number,
        required: true
    },
    "Celta de Vigo": {
        type: Number,
        required: true
    },
    Chelsea: {
        type: Number,
        required: true
    },
    Clermont: {
        type: Number,
        required: true
    },
    "Crystal Palace": {
        type: Number,
        required: true
    },
    Cádiz: {
        type: Number,
        required: true
    },
    "Darmstadt 98": {
        type: Number,
        required: true
    },
    "Deportivo Alavés": {
        type: Number,
        required: true
    },
    "Eintracht Frankfurt": {
        type: Number,
        required: true
    },
    Empoli: {
        type: Number,
        required: true
    },
    Everton: {
        type: Number,
        required: true
    },
    Fiorentina: {
        type: Number,
        required: true
    },
    Freiburg: {
        type: Number,
        required: true
    },
    Frosinone: {
        type: Number,
        required: true
    },
    Fulham: {
        type: Number,
        required: true
    },
    Genoa: {
        type: Number,
        required: true
    },
    Getafe: {
        type: Number,
        required: true
    },
    Girona: {
        type: Number,
        required: true
    },
    Granada: {
        type: Number,
        required: true
    },
    Heidenheim: {
        type: Number,
        required: true
    },
    "Hellas Verona": {
        type: Number,
        required: true
    },
    Hoffenheim: {
        type: Number,
        required: true
    },
    Internazionale: {
        type: Number,
        required: true
    },
    Juventus: {
        type: Number,
        required: true
    },
    Köln: {
        type: Number,
        required: true
    },
    "Las Palmas": {
        type: Number,
        required: true
    },
    "Lazio": {
        type: Number,
        required: true
    },
    "Le Havre": {
        type: Number,
        required: true
    },
    Lecce: {
        type: Number,
        required: true
    },
    Lens: {
        type: Number,
        required: true
    },
    Lille: {
        type: Number,
        required: true
    },
    Liverpool: {
        type: Number,
        required: true
    },
    Lorient: {
        type: Number,
        required: true
    },
    "Luton Town": {
        type: Number,
        required: true
    },
    "Mainz 05": {
        type: Number,
        required: true
    },
    "Mallorca": {
        type: Number,
        required: true
    },
    "Manchester City": {
        type: Number,
        required: true
    },
    "Manchester United": {
        type: Number,
        required: true
    },
    Metz: {
        type: Number,
        required: true
    },
    Milan: {
        type: Number,
        required: true
    },
    Monaco: {
        type: Number,
        required: true
    },
    Montpellier: {
        type: Number,
        required: true
    },
    Monza: {
        type: Number,
        required: true
    },
    Nantes: {
        type: Number,
        required: true
    },
    Napoli: {
        type: Number,
        required: true
    },
    "Newcastle United": {
        type: Number,
        required: true
    },
    Nice: {
        type: Number,
        required: true
    },
    "Nottingham Forest": {
        type: Number,
        required: true
    },
    "Olympique Lyonnais": {
        type: Number,
        required: true
    },
    "Olympique Marseille": {
        type: Number,
        required: true
    },
    Osasuna: {
        type: Number,
        required: true
    },
    PSG: {
        type: Number,
        required: true
    },
    "Rayo Vallecano": {
        type: Number,
        required: true
    },
    "RB Leipzig": {
        type: Number,
        required: true
    },
    "Real Betis": {
        type: Number,
        required: true
    },
    "Real Madrid": {
        type: Number,
        required: true
    },
    "Real Sociedad": {
        type: Number,
        required: true
    },
    Reims: {
        type: Number,
        required: true
    },
    Rennes: {
        type: Number,
        required: true
    },
    Roma: {
        type: Number,
        required: true
    },
    Salernitana: {
        type: Number,
        required: true
    },
    Sassuolo: {
        type: Number,
        required: true
    },
    Sevilla: {
        type: Number,
        required: true
    },
    "Sheffield United": {
        type: Number,
        required: true
    },
    Strasbourg: {
        type: Number,
        required: true
    },
    Stuttgart: {
        type: Number,
        required: true
    },
    Torino: {
        type: Number,
        required: true
    },
    "Tottenham Hotspur": {
        type: Number,
        required: true
    },
    Toulouse: {
        type: Number,
        required: true
    },
    Udinese: {
        type: Number,
        required: true
    },
    "Union Berlin": {
        type: Number,
        required: true
    },
    Valencia: {
        type: Number,
        required: true
    },
    Villarreal: {
        type: Number,
        required: true
    },
    "Werder Bremen": {
        type: Number,
        required: true
    },
    "West Ham United": {
        type: Number,
        required: true
    },
    Wolfsburg: {
        type: Number,
        required: true
    },
    "Wolverhampton Wanderers": {
        type: Number,
        required: true
    },
});

module.exports = mongoose.model("CompatabilityScores", compatabilityScoresSchema);