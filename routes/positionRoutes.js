const router = require("express").Router();
const verifyToken = require('../middleware/auth');

const AM = require("../models/AM");
const CB = require("../models/CB");
const CM = require("../models/CM");
const DM = require("../models/DM");
const FWD = require("../models/FWD");
const LB = require("../models/LB");
const LW = require("../models/LW");
const RB = require("../models/RB");
const RW = require("../models/RW");

const Player = require("../models/player");
const collections = [AM, CB, CM, DM, FWD, LB, LW, RB, RW];

// Return element in the positional data collections with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({ params: { id } }, res, next) => {
    try {
        // Iterate over each collection and search for the document
        for (const model of collections) {
            const document = await model.findOne({ UniqueID: id });
            if (document) {
                return res.status(200).json(document);
            }
        }
        res.status(404).json({ message: 'Document not found in any collection.' });
    } catch (error) {
        return res.status(500).json({ message: 'Error finding document', error });
    }
});
// Return element in the positional data collections with a UniqueID matching that of the id parameter and format data for radar graph
router.get("/get/:id/graph", verifyToken, async (req, res, next) => {
    const { id } = req.params;
    let { season } = req.query;
    try {

        // Variables to store the original player object and the matching season's player object
        let originalPlayer, seasonMatch;

        // If Season was specified as a query parameter
        if (season) {

            // Find original player record
            originalPlayer = await Player.findOne({ UniqueID: id })

            if (!originalPlayer) {
                return res.status(404).json({ message: "Could not find player with specified ID" });
            }

            // Find matching player record from specified season
            seasonMatch = await Player.findOne({ Player: originalPlayer.Player, Team: originalPlayer.Team, Age: originalPlayer.Age, Birth_country: originalPlayer.Birth_country, Passport_country: originalPlayer.Passport_country, Age: originalPlayer.Age, Season: season })

            if (!seasonMatch) {
                return res.status(404).json({ message: "Data for selected season not found" });
            }
        }

        let result = null;

        if (season) {
            // Iterate over each collection and search for the document
            for (const model of collections) {
                result = await model.findOne({ UniqueID: seasonMatch.UniqueID });
                if (result) break; // Stop searching if a match is found
            }
        }
        else {
            // Iterate over each collection and search for the document
            for (const model of collections) {
                result = await model.findOne({ UniqueID: id });
                if (result) break; // Stop searching if a match is found
            }
        }


        if (!result) {
            return res.status(404).json({ message: "Data not found in any collection" });
        }

        // Transform data for radar chart
        const formattedData = Object.entries(result.toObject())
            .filter(([key, value]) => key !== "_id" && key !== "UniqueID" && typeof value === "number")
            .map(([label, score]) => ({
                label: label.replace(/_/g, " "),
                score
            }));

        res.json(formattedData);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching radar chart data", error });
    }
});

module.exports = router;