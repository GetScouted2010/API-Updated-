const router = require("express").Router();
const verifyToken = require('../middleware/auth');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require("../models/users");
const Team = require("../models/playstyles")
const TeamPassword = require("../models/TeamPassword");

// Function to create a new team password
async function createTeamPassword(plainPassword, team, maxUses) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt); // Hash the password

    const teamPassword = new TeamPassword({
      password: hashedPassword,
      team,
      maxUses,
      currentUses: 0,
    });

    await teamPassword.save();
    console.log('Team password created successfully.');
  } catch (error) {
    console.error('Error creating team password:', error);
  }
}

// POST route for creating a user - Commented out to disable route in production during testing
// router.post('/register', async (req, res) => {
//   const { email, firstname, lastname, username, password, role, team } = req.body;

//   // Basic input validation
//   if (!email || !firstname || !lastname || !username || !password || !role || !team) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }

//   try {
//     // Check if the user already exists (via email)
//     const existingUserEmail = await User.findOne({ email });
//     if (existingUserEmail) {
//       return res.status(400).json({ error: 'User with this email already exists' });
//     }

//     // Check if the user already exists (via username)
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ error: 'This username is taken' });
//     }

//     // Check if the team exists against the playstyles table
//     const validTeam = await Team.findOne({ Team: team });
//     if (!validTeam) {
//       return res.status(400).json({ error: 'Invalid team. Please select a valid team.' });
//     }

//     // Hash the password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create a new user instance with the hashed password
//     const newUser = new User({
//       email,
//       firstname,
//       lastname,
//       username,
//       password: hashedPassword,  // Use the hashed password
//       role,
//       team
//     });

//     // Save the user to the database
//     await newUser.save();

//     res.status(201).json({ message: 'User created successfully', user: { username, email, firstname, lastname, role, team } });
//   } catch (error) {
//     return res.status(500).json({ error: 'Server error' });
//   }
// });

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
    const payload = { id: user._id, username: user.username, firstname: user.firstname, lastname: user.lastname, team: user.team, role: user.role };
    // Sign the JWT with the secret key and set expiration
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    // Send the JWT token to the client
    res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// pulls data from JWT to gather details of the current user from the users collection
router.get("/getUser", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    let found = await User.findOne(
      { _id: userId }, 
      { username: 1, email: 1, firstname: 1, lastname: 1, role: 1, team: 1 }
  );
  
  if (found) {
      // Fetch the related team document based on the team field from the user
      const teamFind = await Team.findOne({ Team: found.team });
  
      // Add the teamId to the found object if teamFind exists
      if (teamFind) {
          found = { ...found._doc, teamId: teamFind.UniqueID };
      }
  }
    return res.json(found);
  } catch (error) {
    return res.status(400).json({ message: "Error fetching user data", error })
  }
});

// GET route to pull a list of available teams for registration
router.get("/getTeamsList", async (req, res, next) => {
  try {
    const list = await Team.find({}, { _id: 0, Team: 1 });
    return res.json(list)
  } catch (error) {
    return res.status(400).json({ message: "Error fetching list of teams", error })
  }
});

// Route to allow the user to update either fullname or password
router.put('/update', verifyToken, async (req, res) => {
  const { firstname, lastname, oldPassword, newPassword } = req.body;
  const userId = req.user.id; // Extract userId from req.user (set by verifyToken)

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update firstname if provided
    if (firstname) {
      user.firstname = firstname;
    }

    // Update lastname if provided
    if (lastname) {
      user.lastname = lastname;
    }

    // Update password if provided
    if (oldPassword && newPassword) {
      // Verify the old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedPassword;
    }

    // Save the updated user data
    await user.save();

    res.json({ message: 'Profile updated successfully', user: { firstname: user.firstname, lastname: user.lastname } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Registration Route to allow users to sign up with a pre-defined Team password
router.post('/register2', async (req, res) => {
  const { email, firstname, lastname, username, password, role, teamPassword } = req.body;

  try {
    // Fetch all team passwords and attempt to find a match
    const teamPasswords = await TeamPassword.find();

    let validTeamPassword = null;

    for (const teamPasswordDoc of teamPasswords) {
      const isMatch = await bcrypt.compare(teamPassword, teamPasswordDoc.password);
      if (isMatch) {
        validTeamPassword = teamPasswordDoc;
        break;
      }
    }

    if (!validTeamPassword || validTeamPassword.currentUses >= validTeamPassword.maxUses) {
      return res.status(400).json({ error: 'Invalid or exhausted team password.' });
    }

    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    // Check if the email already exists
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      email,
      firstname,
      lastname,
      username,
      password: hashedPassword,  // Use the hashed password
      role,
      team: validTeamPassword.team,
    });

    await newUser.save();

    // Increment the usage counter for the team password
    validTeamPassword.currentUses += 1;
    await validTeamPassword.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


module.exports = router;