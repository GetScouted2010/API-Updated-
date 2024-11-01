const express = require('express');
const cors = require('cors');
const { default: mongoose } = require("mongoose");

// Import API Key Middleware
const validateApiKey = require('./middleware/apikey');

// .env import for JWT and DB URL
require('dotenv').config();

const app = express();
const PORT = 3000;

// Import routes for collection mapping to API
const playerRoutes = require("./routes/playerRoutes");
const compatibilityRoutes = require("./routes/compatibilityRoutes");
const transferRoutes = require("./routes/transferRoutes");
const positionRoutes = require("./routes/positionRoutes");
const playstyleRoutes = require("./routes/playstyleRoutes");
const shortlistRoutes = require("./routes/shortlistRoutes");
const userRoutes = require("./routes/userRoutes");

app.use(cors());
app.use(express.json());

// Allows recognition of x-forwarded-proto header
app.enable('trust proxy');

// Pull DB_URL from .env file for connection to MongoDB
mongoose.connect(process.env.DB_URL)

// Force SSL in production (Must configure load balancer on AWS before deployment)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const server = app.listen(PORT, (error) => {
  if (!error)
    console.log("Server is Successfully Running and App is listening on port " + PORT)
  else
    console.log("Error occurred, server could not start", error)
});

// Apply the API key validation middleware to all routes
app.use(validateApiKey);

// Log API request route/query and timestamp for each received request into console
app.use((req, res, next) => {
  console.log(req.method, req.url, new Date());
  return next();
});

// Route Configuration
app.use("/players", playerRoutes);
app.use("/compatibility", compatibilityRoutes);
app.use("/transfers", transferRoutes);
app.use("/positions", positionRoutes);
app.use("/playstyles", playstyleRoutes);
app.use("/shortlists", shortlistRoutes);
app.use("/users", userRoutes);

module.exports = server;