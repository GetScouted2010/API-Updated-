const router = require("express").Router();
const Playstyle = require("../models/playstyles");
const verifyToken = require('../middleware/auth');

// Return all elements in the 'playstyles' collection
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const found = await Playstyle.find();
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching playstyles", error })
    }
});

// Return element in the 'playstyles' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await Playstyle.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Playstyle data with the ID: ${id}' });
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching playstyles", error })
    }
});

// Return all elements in the 'playstyles' collection with data matching the query parameter
router.get("/find", verifyToken, async ({ query }, res, next) => {
    try{
        const player = await Playstyle.find(query);
        return res.json(player);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching playstyles", error })
    } 
});

// Return element in the 'playstyles' collection with a UniqueID matching that of the id parameter and format data for radar graph
router.get("/get/:id/graph", verifyToken, async ({ params: { id } }, res, next) => {
    try {

        result = await Playstyle.findOne({ UniqueID: id });

        if (!result) {
            return res.status(404).json({ message: "Data not found in any collection" });
        }

        // Transform data for radar chart
        const formattedData = Object.entries(result.toObject())
            .filter(([key, value]) => key !== "_id" && key !== "UniqueID" && typeof value === "number")
            .map(([label, score]) => ({ 
                label: label.replace(/_/g, " "), 
                score }));

        res.json({[result.Team]: formattedData});

    } catch (error) {
        return res.status(500).json({ message: "Error fetching radar chart data", error });
    }
});

module.exports = router;