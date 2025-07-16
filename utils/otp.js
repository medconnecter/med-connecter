/**
 * Generates a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

module.exports = {
  generateOTP
}; 