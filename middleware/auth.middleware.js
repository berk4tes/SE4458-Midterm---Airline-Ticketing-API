const jwt = require('jsonwebtoken');

/**
 * Middleware: require a valid JWT token.
 * Optionally restrict to a specific role.
 */
function requireAuth(role) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (role && decoded.role !== role) {
        return res.status(403).json({ success: false, message: `Forbidden: requires role '${role}'` });
      }

      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };
}

module.exports = { requireAuth };
