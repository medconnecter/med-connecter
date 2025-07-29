const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const { generateOTP } = require('../utils/otp');
const logger = require('../utils/logger');

class OTPService {
  static async generateAndSendOTP (identifier, type, countryCode = null) {
    try {
      // First, expire all existing OTPs for this identifier and type
      await OTP.updateMany(
        {
          identifier,
          type,
          isExpired: false
        },
        {
          $set: {
            isExpired: true,
            expiredAt: new Date()
          }
        }
      );

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create new OTP record
      const otpRecord = new OTP({
        identifier,
        type,
        otp,
        expiresAt,
        countryCode,
        isExpired: false
      });

      await otpRecord.save();

      // Send OTP based on type
      if (type === 'email') {
        await emailService.sendOTP(identifier, otp);
      } else if (type === 'phone') {
        // TODO: Implement SMS service
        logger.info('SMS OTP sending not implemented:', { identifier, type });
      }

      return {
        success: true,
        message: `OTP sent to ${type}`,
        expiresAt
      };
    } catch (error) {
      logger.error('Error generating and sending OTP:', error);
      throw error;
    }
  }

  static async verifyOTP (identifier, otp, type, countryCode = null) {
    try {
      // Find the most recent unexpired OTP
      const otpRecord = await OTP.findOne({
        identifier,
        type,
        otp,
        isExpired: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      // Mark OTP as expired
      otpRecord.isExpired = true;
      otpRecord.expiredAt = new Date();
      await otpRecord.save();

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  static async resendOTP (identifier, type, countryCode = null) {
    try {
      // Find user based on identifier type
      const user = await User.findOne(
        type === 'email'
          ? { email: identifier }
          : { 'phone.number': identifier }
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Check if there's a valid unexpired OTP
      const existingOTP = await OTP.findOne({
        identifier,
        type,
        isExpired: false,
        expiresAt: { $gt: new Date() }
      });

      if (existingOTP) {
        const timeLeft = Math.ceil((existingOTP.expiresAt - new Date()) / 1000 / 60);
        return {
          success: false,
          message: `Please wait ${timeLeft} minutes before requesting a new OTP`
        };
      }

      // Generate and send new OTP
      return await this.generateAndSendOTP(identifier, type, countryCode);
    } catch (error) {
      logger.error('Error resending OTP:', error);
      throw error;
    }
  }

  static async getOTPAttempts (identifier, type) {
    try {
      const attempts = await OTP.aggregate([
        {
          $match: {
            identifier,
            type,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: '$attempts' },
            totalOTPs: { $sum: 1 }
          }
        }
      ]);

      return attempts[0] || { totalAttempts: 0, totalOTPs: 0 };
    } catch (error) {
      logger.error('Error getting OTP attempts:', error);
      throw error;
    }
  }

  static async checkOTP (identifier, type) {
    try {
      // Find the most recent unexpired OTP
      const otpRecord = await OTP.findOne({
        identifier,
        type,
        isExpired: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      return {
        exists: !!otpRecord,
        expiresAt: otpRecord?.expiresAt
      };
    } catch (error) {
      logger.error('Error checking OTP:', error);
      throw error;
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs () {
    try {
      const result = await OTP.updateMany(
        {
          $or: [
            { expiresAt: { $lt: new Date() } },
            { isExpired: true }
          ]
        },
        {
          $set: {
            isExpired: true,
            expiredAt: new Date()
          }
        }
      );
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      throw error;
    }
  }
}

module.exports = OTPService;
