const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(403).json({ error: 'No token provided' });
    }
    // Verify token
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      // Token is valid, save user data to request
      req.user = decoded;
      next();
    });
  };

  module.exports = verifyToken;