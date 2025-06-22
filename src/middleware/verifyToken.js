const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided', statusCode: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', statusCode: 401 });
  }
};

module.exports = verifyToken;