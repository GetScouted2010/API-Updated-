const router = require("express").Router();
const verifyToken = require('../middleware/auth');

const TransferData = require("../models/transferData");

// Route to get all existing transfer data
router.get("/getAll", verifyToken, async (req, res, next) => {
  try {
    const transferData = await TransferData.find();
    return res.json(transferData);
  } catch (error) {
    return res.status(400).json({ message: "Error fetching transfer data", error })
  }
});

// Route to get a specific transfer record by uniqueId
router.get("/get/:id", verifyToken, async ({ params: { id } }, res, next) => {
  try {
    const found = await TransferData.find({ UniqueID: id });
    if (!found) return next({ status: 404, message: 'No data for the Transfer with the ID: ${id}' });
    return res.json(found);
  } catch (error) {
    return res.status(400).json({ message: "Error fetching transfer data", error })
  }
});

// Route to query the transfer records collection via query params
router.get("/find", verifyToken, async ({ query }, res, next) => {
  try {
    const transferData = await TransferData.find(query);
    return res.json(transferData);
  } catch (error) {
    return res.status(400).json({ message: "Error fetching transfer data", error })
  }
});

// Route to get Minimum, Maximum, and Average values for specified club's transfers based on the position provided
router.get('/getAverages', verifyToken, async (req, res) => {
  try {
    const { Club, UniqueID, Position } = req.query;

    // Validate input
    if (!Position) {
      return res.status(400).json({ error: 'Please provide a Position query parameter.' });
    }
    if (!Club && !UniqueID) {
      return res.status(400).json({ error: 'Please provide a Club or UniqueID query parameter.' });
    }

    // Build query
    const query = { Short_Position: Position };
    if (Club) query.Club = Club;
    if (UniqueID) query.UniqueID = UniqueID;

    // Fetch matching records
    const records = await TransferData.find(query);

    if (!records.length) {
      return res.status(404).json({ message: 'No matching records found.' });
    }

    // Initialize stats
    const stats = {
      Age: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
      Market_Value: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
      Fee_Cleaned: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
    };

    // Calculate stats
    records.forEach(record => {
      if(record.is_loan === false && record.loan_status === 0 && record.Movement === "arrival"){
      // Ensure values are numbers and not null/undefined
      const age = record.Age || 0;
      const marketValue = record.Market_Value ? parseFloat(record.Market_Value.toFixed(1)) : 0; // Round to 1 decimal place
      const feeCleaned = record.Fee_Cleaned ? parseFloat(record.Fee_Cleaned.toFixed(1)) : 0; // Round to 1 decimal place

      // Age calculations
      stats.Age.min = Math.min(stats.Age.min, age);
      stats.Age.max = Math.max(stats.Age.max, age);
      stats.Age.sum += age;
      stats.Age.count++;

      // Market_Value calculations
      stats.Market_Value.min = Math.min(stats.Market_Value.min, marketValue);
      stats.Market_Value.max = Math.max(stats.Market_Value.max, marketValue);
      stats.Market_Value.sum += marketValue;
      stats.Market_Value.count++;

      // Fee_Cleaned calculations
      stats.Fee_Cleaned.min = Math.min(stats.Fee_Cleaned.min, feeCleaned);
      stats.Fee_Cleaned.max = Math.max(stats.Fee_Cleaned.max, feeCleaned);
      stats.Fee_Cleaned.sum += feeCleaned;
      stats.Fee_Cleaned.count++;
      }
    });


    // Compute averages and round as specified
    const response = {
      Age: {
        min: stats.Age.min === Infinity ? null : stats.Age.min,
        max: stats.Age.max === -Infinity ? null : stats.Age.max,
        avg: stats.Age.count ? Math.round(stats.Age.sum / stats.Age.count) : null, // Round to nearest whole number
      },
      Market_Value: {
        min: stats.Market_Value.min === Infinity ? null : stats.Market_Value.min,
        max: stats.Market_Value.max === -Infinity ? null : stats.Market_Value.max,
        avg: stats.Market_Value.count ? parseFloat((stats.Market_Value.sum / stats.Market_Value.count).toFixed(1)) : null, // Round to 1 decimal place
      },
      Fee_Cleaned: {
        min: stats.Fee_Cleaned.min === Infinity ? null : stats.Fee_Cleaned.min,
        max: stats.Fee_Cleaned.max === -Infinity ? null : stats.Fee_Cleaned.max,
        avg: stats.Fee_Cleaned.count ? parseFloat((stats.Fee_Cleaned.sum / stats.Fee_Cleaned.count).toFixed(1)) : null, // Round to 1 decimal place
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Route to list all unique clubs in the transferdata collection
router.get('/listClubs', async (req, res) => {
  try {
    // Use aggregation to group by 'Club', select a representative 'UniqueID', and sort by 'Club'
    const uniqueClubs = await TransferData.aggregate([
      {
        $group: {
          _id: '$Club',
          UniqueID: { $first: '$UniqueID' }, // Selects the first UniqueID found for each unique Club
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default '_id' field from the output
          Club: '$_id', // Rename the grouped '_id' field to 'Club'
          UniqueID: 1, // Include the UniqueID field
        },
      },
      {
        $sort: { Club: 1 }, // Sorts the results by 'Club' in ascending order (alphabetical)
      },
    ]);

    res.json(uniqueClubs);
  } catch (error) {
    console.error('Error fetching unique clubs:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/listPositions', async (req, res) => {
  try {
    // Aggregate the collection to find distinct 'Short_Position' values
    const positions = await TransferData.aggregate([
      {
        // Group by the 'Short_Position' field to get unique values
        $group: {
          _id: '$Short_Position'
        }
      },
      {
        // Rename the field _id to 'Position'
        $project: {
          _id: 0,
          Position: '$_id'
        }
      },
      {
        // Sort the results alphabetically by 'Position'
        $sort: {
          Position: 1
        }
      }
    ]);

    res.json(positions);
  } catch (error) {
    console.error('Error fetching unique positions:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;