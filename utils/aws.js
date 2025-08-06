const { SNSClient } = require('@aws-sdk/client-sns');
const logger = require('./logger');

// Create a single SNS client instance for SMS
const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Log AWS configuration (without sensitive data)
logger.info('AWS Configuration:', {
  region: process.env.AWS_REGION,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = {
  snsClient
};
