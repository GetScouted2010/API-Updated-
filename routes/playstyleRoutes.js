const router = require("express").Router();
const Playstyle = require("../models/playstyles");

// Return all elements in the 'playstyles' collection
router.get("/getAll", async (req, res, next) =>{
    try{
        const found = await Playstyle.find();
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'playstyles' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", async ({params: { id } }, res, next) =>{
    try{
        const found = await Playstyle.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Playstyle with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return next({ status: 400, message: error.message});
    }
});

// Return all elements in the 'playstyles' collection with data matching the query parameter
router.get("/find", async ({ query }, res, next) => {
    try{
        const player = await Playstyle.find(query);
        return res.json(player);
    } catch (error) {
        return next({ status: 400, message: error.message});
    } 
});

module.exports = router;