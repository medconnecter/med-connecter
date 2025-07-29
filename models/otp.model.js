const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  expiredAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
otpSchema.index({ identifier: 1, type: 1, isExpired: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
otpSchema.pre('save', function (next) {
  if (this.isExpired && !this.expiredAt) {
    this.expiredAt = new Date();
  }
  next();
});

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
