const { verifyToken } = require('../utils/helpers');
const config = require('../config/config');
const Session = require('../models/session.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token and session
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = verifyToken(token);
        
        // Find user and check if they exist
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }

        // Check if user is active
        if (user.status !== 'active') {
          return res.status(401).json({
            success: false,
            error: 'User account is inactive'
          });
        }

        // Verify session exists and is active
        const session = await Session.findOne({
          userId: user._id,
          tokenId: decoded.tokenId,
          isActive: true
        });

        if (!session) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired session'
          });
        }

        // Attach user and session to request object
        req.user = user;
        req.token = token;
        req.session = session;
        next();
      } catch (error) {
        logger.error('Token verification error:', error);
        return res.status(401).json({
          success: false,
          error: error.message || 'Invalid token'
        });
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Authorize based on roles
  static authorize(allowedRoles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Admin has access to everything
        if (req.user.role === 'admin') {
          next();
          return;
        }

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }

        // For doctor-specific routes, verify doctor profile
        if (req.user.role === 'doctor') {
          Doctor.findOne({ userId: req.user._id })
            .then(doctor => {
              if (!doctor) {
                return res.status(403).json({
                  success: false,
                  error: 'Doctor profile not found'
                });
              }
              req.doctor = doctor;
              next();
            })
            .catch(error => {
              logger.error('Doctor verification error:', error);
              return res.status(500).json({
                success: false,
                error: 'Error verifying doctor profile'
              });
            });
        } else {
          next();
        }
      } catch (error) {
        logger.error('Authorization error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  static requireVerifiedEmail(req, res, next) {
    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email verification required'
      });
    }
    next();
  }

  static requireVerifiedPhone(req, res, next) {
    if (!req.user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        error: 'Phone verification required'
      });
    }
    next();
  }

  static requireVerifiedProfile(req, res, next) {
    if (!req.user.isEmailVerified || !req.user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        error: 'Complete profile verification required'
      });
    }
    next();
  }

  // Check if user is a doctor
  static requireDoctor(req, res, next) {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Doctor access required'
      });
    }
    next();
  }

  // Check if user is an admin
  static requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  }

  // Check if doctor profile is verified
  static async requireVerifiedDoctor(req, res, next) {
    try {
      // Admin bypass
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || doctor.status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: 'Verified doctor profile required'
        });
      }
      next();
    } catch (error) {
      console.error('Error in requireVerifiedDoctor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify doctor status'
      });
    }
  }
}

module.exports = AuthMiddleware;
