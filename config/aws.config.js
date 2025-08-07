const { SNSClient } = require('@aws-sdk/client-sns');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  s3: {
    bucket: process.env.AWS_BUCKET || 'your-default-bucket-name'
  }
};

// Initialize AWS clients
const snsClient = new SNSClient(awsConfig);
const sqsClient = new SQSClient(awsConfig);
const s3Client = new S3Client(awsConfig);

module.exports = {
  snsClient,
  sqsClient,
  s3Client,
  getSignedUrl,
  awsConfig
};
