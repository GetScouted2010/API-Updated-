const router = require("express").Router();
const verifyToken = require('../middleware/auth');

const TransferData = require("../models/transferData");

// Route to get all existing transfer data
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const transferData = await TransferData.find();
        return res.json(transferData);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Route to get a specific transfer record by uniqueId
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await TransferData.find({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No data for the Transfer with the ID: ${id}' });
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message});
    }
});

// Route to query the transfer records collection via query params
router.get("/find", verifyToken, async ({ query }, res, next) => {
    try{
        const transferData = await TransferData.find(query);
        return res.json(transferData);
    } catch (err) {
        return next({ status: 400, message: err.message});
    } 
});

module.exports = router;