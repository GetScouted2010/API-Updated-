const router = require("express").Router();

const Player = require("../models/player");

const Position = require('../models/positions')
const AM = require("../models/AM");
const CB = require("../models/CB");
const CM = require("../models/CM");
const DM = require("../models/DM");
const FWD = require("../models/FWD");
const LB = require("../models/LB");
const LW = require("../models/LW");
const RB = require("../models/RB");
const RW = require("../models/RW");

// Return all elements in the 'positions' collection
router.get("/getAll", async (req, res, next) =>{
    try{
        const found = await Position.find();
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'positions' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", async ({params: { id } }, res, next) =>{
    try{
        const found = await Position.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return next({ status: 400, message: error.message});
    }
});

// Everything below this line is a WIP, endpoints return a result but not the expected result
router.get("/find", async ({ query }, res, next) => {
    try{
        const found = await Position.find(query).setOptions({ strict: false });
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

router.get("/am/find", async ({ query }, res, next) => {
    try{
        const found = await AM.find(query);
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

module.exports = router;