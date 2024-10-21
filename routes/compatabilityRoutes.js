const router = require("express").Router();
const CompatabilityScores = require("../models/compatabilityScores");

// Return all elements in the 'compatabilityscores' collection
router.get("/getAll", async (req, res, next) =>{
    try{
        const cs = await CompatabilityScores.find();
        return res.json(cs);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'compatabilityscores' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", async ({params: { id } }, res, next) =>{
    try{
        const found = await CompatabilityScores.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No data for the player with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return next({ status: 400, message: error.message});
    }
});

module.exports = router;