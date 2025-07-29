const jwt = require('jsonwebtoken');
const config = require('../config');
const validator = require('validator');
const crypto = require('crypto');
const logger = require('./logger');

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT token
const generateToken = (user) => {
  try {
    // Generate a unique token ID
    const tokenId = crypto.randomBytes(32).toString('hex');

    const payload = {
      userId: user._id,
      tokenId, // Include tokenId in payload
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256'
    });

    return { token, tokenId };
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    return decoded;
  } catch (error) {
    logger.error('Error verifying JWT token:', error);
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Format phone number
const formatPhoneNumber = (phone) => {
  return {
    countryCode: phone.countryCode || '+1',
    number: phone.number.replace(/[^0-9]/g, '')
  };
};

// Validate registration number format
const isValidRegistrationNumber = (number) => {
  // Dutch BIG registration number format: 9 digits
  return /^\d{9}$/.test(number);
};

// Validate address
const isValidAddress = (address) => {
  if (!address) return false;
  return (
    address.street
    && address.city
    && address.state
    && address.country
    && address.postalCode
  );
};

// Format currency
const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency
  }).format(amount);
};

// Validate time slot
const isValidTimeSlot = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return start < end && start > new Date();
};

// Calculate average rating
const calculateAverageRating = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return sum / ratings.length;
};

// Format date to ISO string
const formatDate = (date) => {
  return new Date(date).toISOString();
};

// Generate unique ID
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

module.exports = {
  generateOTP,
  generateToken,
  verifyToken,
  isValidEmail,
  isValidPhone,
  formatPhoneNumber,
  isValidRegistrationNumber,
  isValidAddress,
  formatCurrency,
  isValidTimeSlot,
  calculateAverageRating,
  formatDate,
  generateUniqueId
};
