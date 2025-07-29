const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { generateOTP } = require('../utils/otp');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
  try {
    const { email, phone, firstName, lastName, role, address } = req.body;

    // Validate phone number format
    if (!phone || !phone.number || !phone.countryCode) {
      return res.status(400).json({
        message: 'Phone number and country code are required',
        details: {
          phone: {
            number: 'Phone number is required',
            countryCode: 'Country code is required'
          }
        }
      });
    }

    // Validate phone number using SMS service
    try {
      smsService.validatePhoneNumber(phone.number, phone.countryCode);
    } catch (error) {
      return res.status(400).json({
        message: 'Invalid phone number',
        details: {
          phone: {
            number: error.message
          }
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP for phone verification
    const phoneOTP = generateOTP();
    const emailToken = generateToken({ email }, '1h');

    // Create new user
    const user = new User({
      email,
      phone,
      firstName,
      lastName,
      role,
      address,
      phoneOTP,
      phoneOTPExpiry: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    await user.save();

    // Send verification emails and SMS
    try {
      await Promise.all([
        emailService.sendVerificationEmail(email, emailToken),
        smsService.sendOTP(phone.number, phoneOTP, phone.countryCode)
      ]);
    } catch (error) {
      logger.error('Error sending verification messages:', error);
      // Don't fail the registration if messaging fails
    }

    res.status(201).json({
      message: 'User registered successfully. Please verify your email and phone number.',
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register
};
