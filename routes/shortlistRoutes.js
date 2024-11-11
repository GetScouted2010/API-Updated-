const router = require("express").Router();
const mongoose = require('mongoose');

const verifyToken = require('../middleware/auth');

const Shortlist = require("../models/shortlist");

// Route to get all lists created by the currently logged in user
router.get("/getLists", verifyToken, async (req, res, next) =>{
    try{
        const userId = req.user.id;
        const found = await Shortlist.find( {user_id: userId} ).populate('shortlist');
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching Shortlists", error })
    }
});

// Route to get all lists created by the currently logged in user
router.get("/getList/:id", verifyToken, async (req, res, next) =>{
  try{
      const userId = req.user.id;
      const listId = req.params.id;
      const found = await Shortlist.find( {user_id: userId, _id: listId} ).populate('shortlist');
      if (!found) {
        return res.status(404).json({ message: 'List not found' });
      }
      return res.json(found);
  } catch (error) {
      return res.status(400).json({ message: "Error fetching Shortlists", error })
  }
});


// Route to create a new list
router.post('/createList', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const name = req.body.listName;

    // Validate for list name
    if (!name) {
      return res.status(400).json({ error: 'listName is required' });
    }
    try {
      // Create new shortlist
      const newList = new Shortlist({
        user_id: userId, // Convert user ID to ObjectID
        listName: name,
        shortlist: [] // Initialize as an empty array
      });
  
      // Save the new shortlist to the database
      await newList.save();
  
      // Return success response with the created shortlist
      res.status(201).json({
        message: 'Shortlist created successfully',
        record: newList
      });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to add a player to the shortlist
router.post('/addToList', verifyToken, async (req, res) => {
    const { listId, playerId } = req.body;
  
    // Validate inputs
    if (!listId || !playerId) {
      return res.status(400).json({ error: 'listId and playerId are required' });
    }

    try {
      // Update the record by pushing the playerId to the shortlist array
      const updatedRecord = await Shortlist.findByIdAndUpdate(
        listId,
        { $push: { shortlist: playerId } },
        { new: true } // Return the updated document
      );

      // Check if the shortlist was found and updated
      if (!updatedRecord) {
        return res.status(404).json({ error: 'Shortlist not found' });
      }
  
      // Return success response with the updated shortlist
      res.status(200).json({
        message: 'Player added to shortlist successfully',
        record: updatedRecord
      });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to remove a player from a shortlist
router.post('/removeFromList', verifyToken, async (req, res) => {
    const { listId, playerId } = req.body;
  
    // Validate inputs
    if (!listId || !playerId) {
      return res.status(400).json({ error: 'listId and playerId are required' });
    }
  
    try {
  
      // Update the record by removing the playerId from the shortlist array
      const updatedRecord = await Shortlist.findByIdAndUpdate(
        listId,
        { $pull: { shortlist: playerId } }, // Remove objectId from shortlist array
        { new: true } // Return the updated document
      );
  
      // Check if the shortlist was found and updated
      if (!updatedRecord) {
        return res.status(404).json({ error: 'Shortlist not found' });
      }
  
      // Return success response with the updated record
      res.status(200).json({
        message: 'playerId removed from shortlist successfully',
        record: updatedRecord
      });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
  });

// Route to delete a shortlist
router.post('/deleteList', verifyToken, async (req, res) => {
  const { listId } = req.body;

  // Validate input
  if (!listId) {
    return res.status(400).json({ error: 'listId is required' });
  }

  try {
    // Find and delete the record
    const deletedRecord = await Shortlist.findByIdAndDelete(listId);

    // Check if the record was found and deleted
    if (!deletedRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Return success response
    res.status(200).json({
      message: 'Record deleted successfully',
      record: deletedRecord
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;