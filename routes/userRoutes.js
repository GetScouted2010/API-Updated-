const router = require("express").Router();
const verifyToken = require('../middleware/auth');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require("../models/users");
const Team = require("../models/playstyles")

// POST route for creating a user
router.post('/register', async (req, res) => {
  const { email, fullname, username, password, role, team } = req.body;

  // Basic input validation
  if (!email || !fullname || !username || !password || !role || !team) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if the user already exists (via email)
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if the user already exists (via username)
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'This username is taken' });
    }

    const validTeam = await Team.findOne({ Team: team });
    if (!validTeam) {
      return res.status(400).json({ error: 'Invalid team. Please select a valid team.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user instance with the hashed password
    const newUser = new User({
      email,
      fullname,
      username,
      password: hashedPassword,  // Use the hashed password
      role,
      team
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: { username, email, fullname, role, team } });
  } catch (error) {
      return res.status(500).json({ error: 'Server error' });
  }
});

// Login Route: Authenticate user and issue a JWT
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      // Find the user in the database by username
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      // Compare the password with the hashed password stored in the database
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid password' });
      }
      // Create a JWT payload containing userId and username
      const payload = { id: user._id, username: user.username };
      // Sign the JWT with the secret key and set expiration
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
      // Send the JWT token to the client
      res.json({ token });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
  });

// pulls data from JWT to gather details of the current user from the users collection
router.get("/getUser", verifyToken, async (req, res, next) =>{
    try{
        const userId = req.user.id;
        const found = await User.find( {_id: userId}, {username: 1, email: 1, fullname: 1, role: 1, team: 1} );
        return res.json(found);
    } catch (error) {
        return res.status(400).json({ message: "Error fetching user data", error })
    }
});

module.exports = router;