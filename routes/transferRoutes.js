const router = require("express").Router();
const TransferData = require("../models/transferData");


router.get("/getAll", async (req, res, next) =>{
    try{
        const transferData = await TransferData.find();
        return res.json(transferData);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

router.get("/get/:id", async ({params: { id } }, res, next) =>{
    try{
        const found = await TransferData.find({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No data for the Transfer with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return next({ status: 400, message: error.message});
    }
});

router.get("/find", async ({ query }, res, next) => {
    try{
        const transferData = await TransferData.find(query);
        return res.json(transferData);
    } catch (error) {
        return next({ status: 400, message: error.message});
    } 
});

module.exports = router;