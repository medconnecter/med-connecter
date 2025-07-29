const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Validate AWS configuration
const validateAWSConfig = () => {
  if (!config.aws?.accessKeyId) {
    throw new Error('AWS_ACCESS_KEY_ID is required');
  }
  if (!config.aws?.secretAccessKey) {
    throw new Error('AWS_SECRET_ACCESS_KEY is required');
  }
  if (!config.aws?.region) {
    throw new Error('AWS_REGION is required');
  }
  if (!config.aws?.s3?.bucket) {
    throw new Error('AWS_BUCKET is required');
  }
  if (!config.email?.from) {
    throw new Error('EMAIL_FROM is required for SES');
  }
};

// Initialize AWS clients
const s3Client = new S3Client({
  region: config.aws?.region || 'eu-west-1',
  credentials: {
    accessKeyId: config.aws?.accessKeyId,
    secretAccessKey: config.aws?.secretAccessKey
  }
});

const sesClient = new SESClient({
  region: config.aws?.region || 'eu-west-1',
  credentials: {
    accessKeyId: config.aws?.accessKeyId,
    secretAccessKey: config.aws?.secretAccessKey
  }
});

const snsClient = new SNSClient({
  region: config.aws?.region || 'eu-west-1',
  credentials: {
    accessKeyId: config.aws?.accessKeyId,
    secretAccessKey: config.aws?.secretAccessKey
  }
});

const sqsClient = new SQSClient({
  region: config.aws?.region || 'eu-west-1',
  credentials: {
    accessKeyId: config.aws?.accessKeyId,
    secretAccessKey: config.aws?.secretAccessKey
  }
});

class AWSService {
  static async uploadToS3 (buffer, filename, mimetype) {
    try {
      validateAWSConfig();

      const key = `uploads/${Date.now()}-${uuidv4()}-${filename}`;
      const command = new PutObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype
      });

      await s3Client.send(command);
      return `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  static async deleteFromS3 (url) {
    try {
      validateAWSConfig();

      const key = url.split('.com/').pop();
      const command = new DeleteObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  static async sendEmail (to, subject, htmlBody, textBody) {
    try {
      validateAWSConfig();

      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: htmlBody
            },
            Text: {
              Charset: 'UTF-8',
              Data: textBody
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: subject
          }
        },
        Source: config.email.from
      });

      await sesClient.send(command);
    } catch (error) {
      console.error('SES error:', error);
      throw new Error('Failed to send email');
    }
  }

  static async sendSMS (phoneNumber, message) {
    try {
      validateAWSConfig();

      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber
      });

      await snsClient.send(command);
    } catch (error) {
      console.error('SNS error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  static async queueJob (queueUrl, payload) {
    try {
      validateAWSConfig();

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payload)
      });

      await sqsClient.send(command);
    } catch (error) {
      console.error('SQS error:', error);
      throw new Error('Failed to queue job');
    }
  }
}

module.exports = AWSService;
