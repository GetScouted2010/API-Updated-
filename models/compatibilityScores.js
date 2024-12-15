const mongoose = require("mongoose");
const { Schema } = mongoose;

const compatibilityScoresSchema = new Schema({
    UniqueID: {
        type: Number,
        ref: 'Player'
    },
    Position: {
        type: String,
        required: true
    },
    AGF: {
        type: Number,
        required: true
    },
    AIK: {
        type: Number,
        required: true
    },
    AaB: {
        type: Number,
        required: true
    },
    Aberdeen: {
        type: Number,
        required: true
    },
    Ajax: {
        type: Number,
        required: true
    },
    "Almere City": {
        type: Number,
        required: true
    },
    Anderlecht: {
        type: Number,
        required: true
    },
    "Angers SCO": {
        type: Number,
        required: true
    },
    Antwerp: {
        type: Number,
        required: true
    },
    Arouca: {
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
    "Atlanta United": {
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
    "Austin FC": {
        type: Number,
        required: true
    },
    Auxerre: {
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
    Benfica: {
        type: Number,
        required: true
    },
    "Blackburn Rovers": {
        type: Number,
        required: true
    },
    Boavista: {
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
    "Bristol City": {
        type: Number,
        required: true
    },
    Brøndby: {
        type: Number,
        required: true
    },
    Burnley: {
        type: Number,
        required: true
    },
    "CF Montréal": {
        type: Number,
        required: true
    },
    Cagliari: {
        type: Number,
        required: true
    },
    "Cardiff City": {
        type: Number,
        required: true
    },
    "Casa Pia AC": {
        type: Number,
        required: true
    },
    "Celta de Vigo": {
        type: Number,
        required: true
    },
    Celtic: {
        type: Number,
        required: true
    },
    Chelsea: {
        type: Number,
        required: true
    },
    "Chicago Fire": {
        type: Number,
        required: true
    },
    Cincinnati: {
        type: Number,
        required: true
    },
    "Club Brugge": {
        type: Number,
        required: true
    },
    "Colorado Rapids": {
        type: Number,
        required: true
    },
    "Columbus Crew": {
        type: Number,
        required: true
    },
    "Como": {
        type: Number,
        required: true
    },
    "Coventry City": {
        type: Number,
        required: true
    },
    "Crystal Palace": {
        type: Number,
        required: true
    },
    "DC United": {
        type: Number,
        required: true
    },
    Dallas: {
        type: Number,
        required: true
    },
    "Deportivo Alavés": {
        type: Number,
        required: true
    },
    "Derby County": {
        type: Number,
        required: true
    },
    Djurgården: {
        type: Number,
        required: true
    },
    "Eintracht Frankfurt": {
        type: Number,
        required: true
    },
    Elfsborg: {
        type: Number,
        required: true
    },
    Empoli: {
        type: Number,
        required: true
    },
    Espanyol: {
        type: Number,
        required: true
    },
    Estoril: {
        type: Number,
        required: true
    },
    "Estrela Amadora": {
        type: Number,
        required: true
    },
    Everton: {
        type: Number,
        required: true
    },
    Famalicão: {
        type: Number,
        required: true
    },
    Farense: {
        type: Number,
        required: true
    },
    Feyenoord: {
        type: Number,
        required: true
    },
    Fiorentina: {
        type: Number,
        required: true
    },
    "Fortuna Sittard": {
        type: Number,
        required: true
    },
    Freiburg: {
        type: Number,
        required: true
    },
    Fulham: {
        type: Number,
        required: true
    },
    Genk: {
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
    "Gil Vicente": {
        type: Number,
        required: true
    },
    Girona: {
        type: Number,
        required: true
    },
    "Go Ahead Eagles": {
        type: Number,
        required: true
    },
    Groningen: {
        type: Number,
        required: true
    },
    Halmstad: {
        type: Number,
        required: true
    },
    Hearts: {
        type: Number,
        required: true
    },
    Heerenveen: {
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
    Heracles: {
        type: Number,
        required: true
    },
    Hoffenheim: {
        type: Number,
        required: true
    },
    "Holstein Kiel": {
        type: Number,
        required: true
    },
    "Houston Dynamo": {
        type: Number,
        required: true
    },
    "Hull City": {
        type: Number,
        required: true
    },
    Häcken: {
        type: Number,
        required: true
    },
    "IFK Göteborg": {
        type: Number,
        required: true
    },
    "IFK Norrköping": {
        type: Number,
        required: true
    },
    "Inter Miama": {
        type: Number,
        required: true
    },
    Internazionale: {
        type: Number,
        required: true
    },
    "Ipswich Town": {
        type: Number,
        required: true
    },
    Juventus: {
        type: Number,
        required: true
    },
    Kalmar: {
        type: Number,
        required: true
    },
    København: {
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
    "Leeds United": {
        type: Number,
        required: true
    },
    Leganés: {
        type: Number,
        required: true
    },
    "Leicester City": {
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
    "Los Angeles FC": {
        type: Number,
        required: true
    },
    "Los Angeles Galaxy": {
        type: Number,
        required: true
    },
    "Luton Town": {
        type: Number,
        required: true
    },
    Lyngby: {
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
    "Malmö FF": {
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
    Middlesbrough: {
        type: Number,
        required: true
    },
    Midtjylland: {
        type: Number,
        required: true
    },
    Milan: {
        type: Number,
        required: true
    },
    Millwall: {
        type: Number,
        required: true
    },
    "Minnesota United": {
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
    Moreirense: {
        type: Number,
        required: true
    },
    "NAC Breda": {
        type: Number,
        required: true
    },
    NEC: {
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
    "Nashville SC": {
        type: Number,
        required: true
    },
    "New England": {
        type: Number,
        required: true
    },
    "New York City": {
        type: Number,
        required: true
    },
    "New York RB": {
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
    Nordsjælland: {
        type: Number,
        required: true
    },
    "Norwich City": {
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
    "Orlando City": {
        type: Number,
        required: true
    },
    Osasuna: {
        type: Number,
        required: true
    },
    "Oxford United": {
        type: Number,
        required: true
    },
    "PEC Zwolle": {
        type: Number,
        required: true
    },
    PSG: {
        type: Number,
        required: true
    },
    PSV: {
        type: Number,
        required: true
    },
    Parma: {
        type: Number,
        required: true
    },
    "Philadelphia Union": {
        type: Number,
        required: true
    },
    "Plymouth Argyle": {
        type: Number,
        required: true
    },
    "Portland Timbers": {
        type: Number,
        required: true
    },
    Porto: {
        type: Number,
        required: true
    },
    Portsmouth: {
        type: Number,
        required: true
    },
    "Preston North End": {
        type: Number,
        required: true
    },
    "Queens Park Rangers": {
        type: Number,
        required: true
    },
    "RB Leipzig": {
        type: Number,
        required: true
    },
    "RKC Waalwijk": {
        type: Number,
        required: true
    },
    Randers: {
        type: Number,
        required: true
    },
    Rangers: {
        type: Number,
        required: true
    },
    "Rayo Vallecano": {
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
    "Real Salt Lake": {
        type: Number,
        required: true
    },
    "Real Sociedad": {
        type: Number,
        required: true
    },
    "Real Valladolid": {
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
    "Rio Ave": {
        type: Number,
        required: true
    },
    Roma: {
        type: Number,
        required: true
    },
    "SJ Earthquakes": {
        type: Number,
        required: true
    },
    "Saint-Étienne": {
        type: Number,
        required: true
    },
    "Santa Clara": {
        type: Number,
        required: true
    },
    "Seattle Sounders": {
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
    "Sheffield Wednesday": {
        type: Number,
        required: true
    },
    Silkeborg: {
        type: Number,
        required: true
    },
    Sirius: {
        type: Number,
        required: true
    },
    Southampton: {
        type: Number,
        required: true
    },
    "Sparta Rotterdam": {
        type: Number,
        required: true
    },
    "Sporting Braga": {
        type: Number,
        required: true
    },
    "Sporting CP": {
        type: Number,
        required: true
    },
    "St_DOT_ Louis City": {
        type: Number,
        required: true
    },
    "St_DOT_ Pauli": {
        type: Number,
        required: true
    },
    "Stoke City": {
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
    Sunderland: {
        type: Number,
        required: true
    },
    "Swansea City": {
        type: Number,
        required: true
    },
    SønderjyskE: {
        type: Number,
        required: true
    },
    Torino: {
        type: Number,
        required: true
    },
    Toronto: {
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
    Twente: {
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
    "Union Saint-Gilloise": {
        type: Number,
        required: true
    },
    Utrecht: {
        type: Number,
        required: true
    },
    Valencia: {
        type: Number,
        required: true
    },
    "Vancouver Whitecaps": {
        type: Number,
        required: true
    },
    Venezia: {
        type: Number,
        required: true
    },
    Viborg: {
        type: Number,
        required: true
    },
    Villarreal: {
        type: Number,
        required: true
    },
    "Vitória Guimarães": {
        type: Number,
        required: true
    },
    Värnamo: {
        type: Number,
        required: true
    },
    "Västerås SK": {
        type: Number,
        required: true
    },
    Watford: {
        type: Number,
        required: true
    },
    "Werder Bremen": {
        type: Number,
        required: true
    },
    "West Bromwich Albion": {
        type: Number,
        required: true
    },
    "West Ham United": {
        type: Number,
        required: true
    },
    "Willem II": {
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

module.exports = mongoose.model("CompatibilityScores", compatibilityScoresSchema);