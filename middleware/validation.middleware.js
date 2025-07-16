const { validationResult } = require('express-validator');

/**
 * Middleware factory that returns a validation middleware
 * @param {Array} validations - Array of validation chains
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          statusCode: 400,
          status: 'error',
          message: 'Validation Error',
          errors: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        }
      });
    }
    next();
  };
};

module.exports = {
  validate
}; 