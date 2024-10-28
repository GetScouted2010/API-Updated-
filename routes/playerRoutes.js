const router = require("express").Router();
const Player = require("../models/player");
const verifyToken = require('../middleware/auth');

// Return all elements in the 'players' collection
router.get("/getAll", verifyToken, async (req, res, next) =>{
    try{
        const player = await Player.find();
        return res.json(player);
    } catch (err) {
        return next({ status: 400, message: err.message });
    }
});

// Return element in the 'players' collection with a UniqueID matching that of the id parameter
router.get("/get/:id", verifyToken, async ({params: { id } }, res, next) =>{
    try{
        const found = await Player.findOne({ UniqueID: id });
        if (!found) return next({ status: 404, message: 'No Player with the ID: ${id}' });
        return res.json(found);
    } catch (err) {
        return next({ status: 400, message: err.message});
    }
});

// Return all elements in the 'players' collection with data matching the query parameter
router.get("/find", verifyToken, async ({ query }, res, next) => {
    try{
        const player = await Player.find(query);
        return res.json(player);
    } catch (err) {
        return next({ status: 400, message: err.message});
    } 
});

// Returns all elements in the 'players' collection that have either a Player name or Team name containing the parameter
router.get("/search", verifyToken, async ({ query }, res, next) => {
    const regex = new RegExp(query.value, 'i');  //Regex that will take the value parameter from the url and ignore case
    try{
        const playerByName = await Player.find({Player: {$regex: regex}}, {Player: 1, Team: 1, Position: 1}); //Find Players in Player collection that contain the string in param
        const playerByTeam = await Player.find({Team: {$regex: regex}}, {_id: 0, Team: 1}); //Find teams in the Player collection that contain the string in param
        const uniqueTeams = Array.from(new Map(playerByTeam.map(Player => [Player.Team, Player])).values()); // Only display unique teams (no double entries)
        const player = [... new Set([...uniqueTeams, ...playerByName])]; // Merge arrays
        return res.json(player);
    } catch (err) {
        return next({ status: 400, message: err.message});
    } 
});

// GET route for advanced querying (Player filtering with dynamic ranges)
router.get('/filter', verifyToken, async (req, res) => {
    try {
      const query = {};
  
      // Parse the request query parameters
      for (const [key, value] of Object.entries(req.query)) {
        // Split field and operator if it exists (e.g., "price__gte" => ["price", "gte"])
        const [field, operator] = key.split('__');
  
        if (operator === 'gte' || operator === 'lte') {
          // Handle range queries
          if (!query[field]) {
            query[field] = {};
          }
          query[field][`$${operator}`] = Number(value);
        } else {
          // Handle exact matches (treat as string or number based on field's expected type)
          query[field] = isNaN(value) ? value : Number(value);
        }
      }
  
      // Fetch items from MongoDB based on the dynamic query
      const items = await Player.find(query);
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching items' });
    }
  });

module.exports = router;