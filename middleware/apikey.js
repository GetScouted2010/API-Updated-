require('dotenv').config();

const validateApiKey = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  
  // Check if the API key matches the one in the environment variable
  if (apiKey && apiKey === process.env.API_KEY) {
    return next(); // API key is correct, continue to the next middleware or route
  }
  
  // If the API key is missing or incorrect, respond with 403 Forbidden
  return res.status(403).json({ error: 'Forbidden - Invalid API Key' });
};

module.exports = validateApiKey;