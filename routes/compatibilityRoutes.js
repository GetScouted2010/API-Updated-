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
        if (!found) return next({ status: 404, message: 'No data for the player with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching data", error })
    }
});

module.exports = router;