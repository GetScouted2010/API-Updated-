const router = require("express").Router();
const verifyToken = require('../middleware/auth');

// const Position = require('../models/positions')
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
// router.get("/getAll", async (req, res, next) =>{
//     try{
//         const found = await Position.find();
//         return res.json(found);
//     } catch (err) {
//         return next({ status: 400, message: err.message });
//     }
// });

// Return element in the 'positions' collection with a UniqueID matching that of the id parameter
// router.get("/get/:id", async ({params: { id } }, res, next) =>{
//     try{
//         const found = await Position.findOne({ UniqueID: id });
//         if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });
//         return res.json(found);
//     } catch (err) {
//         return next({ status: 400, message: err.message});
//     }
// });

// Everything below this line is a WIP, endpoints return a result but not the expected result
// router.get("/find", async ({ query }, res, next) => {
//     try{
//         const found = await Position.find(query).setOptions({ strict: false });
//         return res.json(found);
//     } catch (err) {
//         return next({ status: 400, message: err.message });
//     }
// });

router.get("/:position/get/:id", verifyToken, async ({params: { position, id } }, res, next) =>{
    try{
        if(position == "AM" | position == "am"){
            const found = await AM.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Attacking Midfielder with the ID: ' + id });
            return res.json(found);
        }
        if(position == "CB" | position == "cb"){
            const found = await CB.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Centre Back with the ID: ' + id });
            return res.json(found);
        }
        if(position == "CM" | position == "cm"){
            const found = await CM.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Centre Midfielder with the ID: ' + id });
            return res.json(found);
        }
        if(position == "DM" | position == "dm"){
            const found = await DM.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Defensive Midfielder with the ID: ' + id });
            return res.json(found);
        }
        if(position == "FWD" | position == "fwd"){
            const found = await FWD.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Forward with the ID: ' + id });
            return res.json(found);
        }
        if(position == "LB" | position == "lb"){
            const found = await LB.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Left Back with the ID: ' + id });
            return res.json(found);
        }
        if(position == "LW" | position == "lw"){
            const found = await LW.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Left Wing with the ID: ' + id });
            return res.json(found);
        }
        if(position == "RB" | position == "rb"){
            const found = await RB.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Right Back with the ID: ' + id });
            return res.json(found);
        }
        if(position == "RW" | position == "rw"){
            const found = await RW.findOne({ UniqueID: id });
            if (!found) return res.status(404).send({ message: 'No Right Wing with the ID: ' + id });
            return res.json(found);
        }
        else{
            return res.status(404).send({ message: 'No Data for Position: ' + position +  ' with the ID: ' + id });
        }
    } catch (err) {
        return next({ status: 400, message: err.message});
    }
});

router.get("/:position/getAll", verifyToken, async ({params: { position } }, res, next) =>{
    try{
        if(position == "AM" | position == "am"){
            const found = await AM.find();
            return res.json(found);
        }
        if(position == "CB" | position == "cb"){
            const found = await CB.find();
            return res.json(found);
        }
        if(position == "CM" | position == "cm"){
            const found = await CM.find();
            return res.json(found);
        }
        if(position == "DM" | position == "dm"){
            const found = await DM.find();
            return res.json(found);
        }
        if(position == "FWD" | position == "fwd"){
            const found = await FWD.find();
            return res.json(found);
        }
        if(position == "LB" | position == "lb"){
            const found = await LB.find();
            return res.json(found);
        }
        if(position == "LW" | position == "lw"){
            const found = await LW.find();
            return res.json(found);
        }
        if(position == "RB" | position == "rb"){
            const found = await RB.find();
            return res.json(found);
        }
        if(position == "RW" | position == "rw"){
            const found = await RW.find();
            return res.json(found);
        }
        else{
            return res.status(404).send({ message: 'No Data for Position: ' + position });
        }
    } catch (err) {
        return next({ status: 400, message: err.message});
    }
});

module.exports = router;