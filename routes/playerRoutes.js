const router = require("express").Router();
const Player = require("../models/player");

// Return all elements in the 'players' collection
router.get("/getAll", async (req, res, next) =>{
    try{
        const player = await Player.find();
        return res.json(player);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'players' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", async ({params: { id } }, res, next) =>{
    try{
        const found = await Player.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return next({ status: 400, message: error.message});
    }
});

// Return all elements in the 'players' collection with data matching the query parameter
router.get("/find", async ({ query }, res, next) => {
    try{
        const player = await Player.find(query);
        return res.json(player);
    } catch (error) {
        return next({ status: 400, message: error.message});
    } 
});

module.exports = router;