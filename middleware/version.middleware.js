const { ValidationError } = require('../utils/error.handler');
const logger = require('../utils/logger');

const supportedVersions = ['v1'];

const versionMiddleware = (req, res, next) => {
  // Get the full original URL
  const fullPath = req.originalUrl;
  logger.info(`Full path: ${fullPath}`);
  
  // Extract version from URL path
  const pathParts = fullPath.split('/');
  logger.info(`Path parts: ${pathParts}`);
  
  // Find the version part (it should be after /api/)
  const apiIndex = pathParts.indexOf('api');
  const version = apiIndex !== -1 && pathParts[apiIndex + 1] ? pathParts[apiIndex + 1] : null;
  
  logger.info(`Extracted version: ${version}`);

  // If no version specified, default to v1
  if (!version) {
    req.apiVersion = 'v1';
    return next();
  }

  // Check if version is supported
  if (!supportedVersions.includes(version)) {
    logger.warn(`Unsupported API version requested: ${version}`);
    throw new ValidationError(`Unsupported API version. Supported versions: ${supportedVersions.join(', ')}`);
  }

  req.apiVersion = version;
  next();
};

module.exports = versionMiddleware; 