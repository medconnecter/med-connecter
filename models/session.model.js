const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenId: {
    type: String,
    required: true,
    unique: true
  },
  deviceInfo: {
    deviceId: String,
    deviceType: String,
    browser: String,
    os: String,
    ipAddress: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  loggedOutAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ tokenId: 1 }, { unique: true });
sessionSchema.index({ lastActivity: 1 });

// Method to check if session is expired (e.g., 24 hours of inactivity)
sessionSchema.methods.isExpired = function () {
  const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return Date.now() - this.lastActivity > inactiveThreshold;
};

// Add static method to clean up expired sessions
sessionSchema.statics.cleanupExpiredSessions = async function () {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  await this.deleteMany({ lastActivity: { $lt: thirtyMinutesAgo } });
};

// Add pre-save middleware to update lastActivity
sessionSchema.pre('save', function (next) {
  this.lastActivity = new Date();
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
