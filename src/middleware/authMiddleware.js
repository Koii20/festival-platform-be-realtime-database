const jwt = require('jsonwebtoken');

const authMiddleware = (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    const senderName = socket.handshake.auth.senderName || socket.handshake.query.senderName;

    if (!userId) {
      return next(new Error('User ID is required'));
    }

    if (!senderName) {
      return next(new Error('Sender name is required'));
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return next(new Error('Invalid User ID format'));
    }

    if (typeof senderName !== 'string' || senderName.trim().length === 0) {
      return next(new Error('Invalid sender name'));
    }

    socket.userId = parsedUserId;
    socket.senderName = senderName.trim();
    
    console.log(`🔐 Socket authenticated for user: ${socket.userId} (${socket.senderName})`);
    next();

  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Invalid user authentication'));
  }
};

const httpAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      userId: decoded.userId || decoded.id || decoded.account_id,
      role: decoded.role
    };

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
};

module.exports = authMiddleware;
module.exports.httpAuth = httpAuthMiddleware;