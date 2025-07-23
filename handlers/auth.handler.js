const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Session = require('../models/session.model');
const OTPService = require('../services/otp.service');
const { generateToken, isValidEmail, isValidPhone, formatPhoneNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

class AuthHandler {
  // Request OTP for login
  static async initiateLogin(req, res) {
    try {
      const { identifier } = req.body; // identifier can be email or phone
      
      if (!identifier) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email or phone number is required' 
        });
      }

      // Determine if identifier is email or phone
      const type = isValidEmail(identifier) ? 'email' : 
                  isValidPhone(identifier) ? 'phone' : null;

      if (!type) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email or phone number format' 
        });
      }

      // Check if user exists
      const user = await User.findOne(
        type === 'email' ? { email: identifier } : 
        { 'phone.number': identifier }
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Generate and send OTP
      if (type === 'phone') {
        //await OTPService.generateAndSendOTP(identifier, 'phone', user.phone.countryCode);
      } else {
        await OTPService.generateAndSendOTP(identifier, 'email');
      }

      res.json({ 
        success: true, 
        message: `OTP sent to your ${type}`,
        type
      });
    } catch (error) {
      console.error('Login initiation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to initiate login' 
      });
    }
  }

  // Verify OTP and login
  static async verifyLogin(req, res) {
    try {
      const { identifier, otp, type, deviceInfo } = req.body;

      if (!identifier || !otp || !type) {
        return res.status(400).json({ 
          success: false, 
          error: 'Identifier, OTP, and type are required' 
        });
      }

      // Verify OTP
      const otpResult = await OTPService.verifyOTP(identifier, otp, type);
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      // Find user
      const user = await User.findOne(
        type === 'email' ? { email: identifier } : 
        { 'phone.number': identifier }
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Auto-verify the identifier used for login
      if (type === 'email' && !user.isEmailVerified) {
        user.isEmailVerified = true;
      } else if (type === 'phone' && !user.isPhoneVerified) {
        user.isPhoneVerified = true;
      }

      // Generate token with tokenId
      const { token, tokenId } = generateToken(user);

      // Create new session
      const session = new Session({
        userId: user._id,
        tokenId,
        deviceInfo,
        isActive: true,
        lastActivity: new Date()
      });
      await session.save();

      // Update last login and save user
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        token,
        sessionId: session._id,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          avatar: user.avatar
        }
      });
    } catch (error) {
      logger.error('Login verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify login' 
      });
    }
  }

  // Check verification status
  static async checkVerificationStatus(req, res) {
    try {
      const { identifier } = req.body; // email or phone

      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'Email or phone number is required'
        });
      }

      // Determine if identifier is email or phone
      const type = isValidEmail(identifier) ? 'email' : 
                  isValidPhone(identifier) ? 'phone' : null;

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email or phone number format'
        });
      }

      // Find user
      const user = await User.findOne(
        type === 'email' ? { email: identifier } : 
        { 'phone.number': identifier }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Verification status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check verification status'
      });
    }
  }

  // Resend verification OTP
  static async resendVerificationOTP(req, res) {
    try {
      const { identifier, type } = req.body;

      if (!identifier || !type) {
        return res.status(400).json({
          success: false,
          error: 'Identifier and type are required'
        });
      }

      // Find user
      const user = await User.findOne(
        type === 'email' ? { email: identifier } : 
        { 'phone.number': identifier }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if already verified
      if (type === 'email' && user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      if (type === 'phone' && user.isPhoneVerified) {
        return res.status(400).json({
          success: false,
          error: 'Phone is already verified'
        });
      }

      // Generate and send OTP
      if (type === 'phone') {
        //await OTPService.generateAndSendOTP(identifier, 'phone', user.phone.countryCode);
      } else {
        await OTPService.generateAndSendOTP(identifier, 'email');
      }

      res.json({
        success: true,
        message: `Verification OTP sent to your ${type}`
      });
    } catch (error) {
      logger.error('Resend verification OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resend verification OTP'
      });
    }
  }

  // Update existing unverified user
  static async updateUnverifiedUser(existingUser, userData) {
    const { firstName, lastName, dob, gender, role, address, email, phone, languages } = userData;

    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.dob = dob;
    existingUser.gender = gender;
    existingUser.role = role;
    existingUser.address = address;
    existingUser.languages = languages;

    // Update phone if changed
    if (phone.number !== existingUser.phone.number) {
      existingUser.phone = formatPhoneNumber(phone);
      existingUser.isPhoneVerified = false;
    }

    // Update email if changed
    if (email !== existingUser.email) {
      existingUser.email = email;
      existingUser.isEmailVerified = false;
    }

    await existingUser.save();

    // Generate and send verification OTPs
    if (!existingUser.isEmailVerified) {
      await OTPService.generateAndSendOTP(email, 'email');
    }
    if (!existingUser.isPhoneVerified) {
      //await OTPService.generateAndSendOTP(phone.number, phone.countryCode);
    }

    return {
      success: true,
      user: existingUser
    };
  }

  // Register new user
  static async register(req, res) {
    try {
      logger.info('Registration request received:', { body: req.body });
      
      const {
        email,
        phone,
        firstName,
        lastName,
        dob,
        gender,
        role = 'patient',
        address,
        languages,
        avatar: avatarUrl // Accept avatar from request body
      } = req.body;

      // Validate required fields
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Email is required and must be a string' });
      }
      if (!phone || typeof phone !== 'object') {
        return res.status(400).json({ success: false, error: 'Phone is required and must be an object' });
      }
      if (!phone.countryCode || typeof phone.countryCode !== 'string' || !/^\+[0-9]{1,4}$/.test(phone.countryCode)) {
        return res.status(400).json({ success: false, error: 'Country code is required and must be in format +<countrycode>' });
      }
      if (!phone.number || typeof phone.number !== 'string' || !/^\+?[1-9]\d{1,14}$/.test(phone.number)) {
        return res.status(400).json({ success: false, error: 'Phone number is required and must be in E.164 format' });
      }
      if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
        return res.status(400).json({ success: false, error: 'First name is required and must be a non-empty string' });
      }
      if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
        return res.status(400).json({ success: false, error: 'Last name is required and must be a non-empty string' });
      }
      if (!dob || isNaN(Date.parse(dob)) || new Date(dob) > new Date()) {
        return res.status(400).json({ success: false, error: 'Date of birth is required, must be a valid date, and must be in the past' });
      }
      if (!gender || !['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ success: false, error: 'Gender is required and must be one of male, female, other' });
      }
      if (!address || typeof address !== 'object') {
        return res.status(400).json({ success: false, error: 'Address is required and must be an object' });
      }
      const requiredAddressFields = ['street', 'city', 'state', 'country', 'postalCode'];
      for (const field of requiredAddressFields) {
        if (!address[field] || typeof address[field] !== 'string' || !address[field].trim()) {
          return res.status(400).json({ success: false, error: `Address field ${field} is required and must be a non-empty string` });
        }
      }
      if (!languages || !Array.isArray(languages) || languages.length === 0 || !languages.every(l => typeof l === 'string' && l.trim())) {
        return res.status(400).json({ success: false, error: 'Languages must be a non-empty array of non-empty strings' });
      }
      if (role && !['patient', 'doctor', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Role must be one of patient, doctor, admin' });
      }

      // Validate email and phone
      if (!isValidEmail(email)) {
        logger.warn('Invalid email format:', { email });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email format' 
        });
      }

      if (!isValidPhone(phone.number)) {
        logger.warn('Invalid phone number format:', { phone });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid phone number format' 
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email },
          { 'phone.number': phone.number }
        ]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this email or phone already exists',
          code: 'USER_ALREADY_EXISTS',
          details: {
            email: existingUser.email === email ? 'Email already registered' : undefined,
            phone: existingUser.phone && existingUser.phone.number === phone.number ? 'Phone number already registered' : undefined
          }
        });
      }

      // Create new user
      const user = new User({
        email,
        phone: formatPhoneNumber(phone),
        firstName,
        lastName,
        dob: new Date(dob),
        gender,
        role,
        address,
        languages,
        isEmailVerified: false,
        isPhoneVerified: false,
        avatar: avatarUrl || ''
      });

      try {
        await user.save();

      } catch (error) {
        if (error.code === 11000) {
          if (error.keyPattern && error.keyPattern.email) {
            return res.status(400).json({
              success: false,
              error: 'A user with this email already exists. Please use a different email or try logging in.'
            });
          } else if (error.keyPattern && error.keyPattern['phone.number']) {
            return res.status(400).json({
              success: false,
              error: 'A user with this phone number already exists. Please use a different phone number or try logging in.'
            });
          } else {
            return res.status(400).json({
              success: false,
              error: 'A user with the provided information already exists.'
            });
          }
        }
        throw error;
      }

      // Generate and send verification OTP
      await OTPService.generateAndSendOTP(email, 'email');
      //await OTPService.generateAndSendOTP(phone.number, 'phone', phone.countryCode);

      logger.info('Registration successful:', { userId: user._id });
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email and phone.',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          dob: user.dob,
          gender: user.gender,
          phone: user.phone,
          address: user.address,
          languages: user.languages,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          avatar: user.avatar
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to register user. Please try again later.'
      });
    }
  }

  // Verify email
  static async verifyEmail(req, res) {
    try {
      const { email, otp } = req.body;

      const otpResult = await OTPService.verifyOTP(email, otp, 'email');
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      user.isEmailVerified = true;
      await user.save();

      res.json({ 
        success: true, 
        message: 'Email verified successfully' 
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify email' 
      });
    }
  }

  // Verify phone
  static async verifyPhone(req, res) {
    try {
      const { phone, otp, countryCode } = req.body;

      const otpResult = await OTPService.verifyOTP(phone, otp, 'phone', countryCode);
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      const user = await User.findOne({ 'phone.number': phone });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      user.isPhoneVerified = true;
      await user.save();

      res.json({ 
        success: true, 
        message: 'Phone verified successfully' 
      });
    } catch (error) {
      console.error('Phone verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify phone' 
      });
    }
  }

  // Logout from current device
  static async logout(req, res) {
    try {
      const session = req.session;
      
      if (!session) {
        return res.status(401).json({
          status: 'error',
          message: 'No active session found'
        });
      }

      // Check if session belongs to the authenticated user
      if (session.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized to logout this session'
        });
      }

      session.isActive = false;
      session.loggedOutAt = new Date();
      await session.save();

      res.json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error during logout'
      });
    }
  }

  // Logout from all devices
  static async logoutAll(req, res) {
    try {
      // Update all active sessions for the user
      await Session.updateMany(
        { 
          userId: req.user._id,
          isActive: true 
        },
        { 
          $set: { 
            isActive: false,
            loggedOutAt: new Date()
          }
        }
      );

      res.json({
        status: 'success',
        message: 'Logged out from all devices'
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error during logout from all devices'
      });
    }
  }
}

module.exports = AuthHandler; 