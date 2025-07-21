const User = require('../models/user.model');
const AWSService = require('../services/aws.service');
const { validationResult } = require('express-validator');

const UserHandler = {
  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, dob, gender, phone, address, languages, avatar } = req.body;
      // Validate required fields
      if (!firstName || !lastName || !dob || !gender || !phone || !address || !languages) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      // Validate dob
      if (isNaN(Date.parse(dob))) {
        return res.status(400).json({ message: 'Invalid date of birth' });
      }
      // Validate gender
      if (!['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ message: 'Invalid gender' });
      }
      // Validate address fields
      const requiredAddressFields = ['street', 'city', 'state', 'country', 'postalCode'];
      for (const field of requiredAddressFields) {
        if (!address[field]) {
          return res.status(400).json({ message: `Missing address field: ${field}` });
        }
      }
      // Validate languages
      if (!Array.isArray(languages) || languages.length === 0) {
        return res.status(400).json({ message: 'Languages must be a non-empty array' });
      }
      // Validate phone
      if (!phone.number || !phone.countryCode) {
        return res.status(400).json({ message: 'Phone number and country code are required' });
      }
      const updateData = { firstName, lastName, dob: new Date(dob), gender, phone, address, languages };
      if (avatar !== undefined) updateData.avatar = avatar;
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update profile picture
  updateProfilePicture: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Upload to S3 using the correct method
      const avatarUrl = await AWSService.uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Update user's avatar URL
      user.avatar = avatarUrl;
      await user.save();

      res.json({ message: 'Profile picture updated successfully', avatar: user.avatar });
    } catch (error) {
      console.error('Error in updateProfilePicture:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = UserHandler; 