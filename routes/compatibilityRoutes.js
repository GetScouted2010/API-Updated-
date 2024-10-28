const router = require("express").Router();
const CompatibilityScores = require("../models/compatibilityScores");
const verifyToken = require('../middleware/auth');

// Return all elements in the 'compatibilityscores' collection
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const cs = await CompatibilityScores.find();
        return res.json(cs);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'compatibilityscores' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await CompatibilityScores.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No data for the player with the ID: ${id}' });
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message});
    }
});

module.exports = router;