const jwt = require('jsonwebtoken');

/**
 * Generate verification token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateVerificationToken = (userId) => {
  return jwt.sign(
    { userId, type: 'verification' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  generateVerificationToken
}; 