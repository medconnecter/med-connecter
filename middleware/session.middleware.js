const logger = require('../utils/logger');
const Session = require('../models/session.model');

const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

const sessionMiddleware = async (req, res, next) => {
  try {
    // Session is already validated in auth middleware
    // Just handle refresh logic here
    const session = req.session;
    
    if (!session) {
      return next();
    }

    const now = Date.now();
    const sessionAge = now - session.lastActivity;
    
    // Check if session is expired
    if (sessionAge > SESSION_EXPIRY) {
      await Session.findByIdAndDelete(session._id);
      return res.status(401).json({
        status: 'error',
        message: 'Session expired'
      });
    }

    // Check if session needs refresh
    if (sessionAge > (SESSION_EXPIRY - REFRESH_THRESHOLD)) {
      // Extend session expiry
      session.lastActivity = now;
      await session.save();
      
      // Add refresh header to response
      res.setHeader('X-Session-Refresh', 'true');
    }

    // Update last activity
    session.lastActivity = now;
    await session.save();

    next();
  } catch (error) {
    logger.error('Session middleware error:', error);
    next(error);
  }
};

module.exports = sessionMiddleware; 