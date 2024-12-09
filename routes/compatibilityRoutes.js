const router = require("express").Router();
const CompatibilityScores = require("../models/compatibilityScores");
const verifyToken = require('../middleware/auth');

// Return all elements in the 'compatibilityscores' collection
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const cs = await CompatibilityScores.find();
        return res.json(cs);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching data", error })
    }
});

// Return element in the 'compatibilityscores' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await CompatibilityScores.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: `No data for the player with the ID: ${id}` });
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching data", error })
    }
});

// Route to get all teams that have compatibility scores
router.get("/teamsList", async (req, res) => {
    try{
        const found = await CompatibilityScores.findOne().lean();
        if(!found){
            return res.status(404).json({ message: 'No documents found in the collection' });
        }

        const fields = Object.keys(found).filter(
            (field) => field !== '_id' && field !== 'UniqueID' && field !== 'Position'
        );

        res.json(fields);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while retrieving field names' });
    }
});

module.exports = router;