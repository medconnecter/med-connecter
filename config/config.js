require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/med-connecter',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },

  // Redis/Valkey settings (AWS ElastiCache) - Temporarily disabled
  /*
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    db: process.env.REDIS_DB || 0,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    // Valkey-specific optimizations
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    commandTimeout: 5000,
    password: process.env.REDIS_PASSWORD,
    // Add connection error handling
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true; // Reconnect when Redis is in readonly mode
      }
      return false;
    }
  },
  */

  // Email settings
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM || 'noreply@medconnecter.com'
  },

  // SMS settings
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    apiKey: process.env.SMS_API_KEY,
    from: process.env.SMS_FROM
  },

  // BIG-register API settings
  bigRegisterApiUrl: process.env.BIG_REGISTER_API_URL || 'https://api.bigregister.nl/v1',
  bigRegisterApiKey: process.env.BIG_REGISTER_API_KEY,

  // AWS settings
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3: {
      bucket: process.env.AWS_S3_BUCKET_NAME
    }
  },

  // Video call settings
  videoCall: {
    provider: process.env.VIDEO_CALL_PROVIDER,
    apiKey: process.env.VIDEO_CALL_API_KEY,
    apiSecret: process.env.VIDEO_CALL_API_SECRET
  },

  // Admin settings
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },

  // Cloud storage settings
  cloudStorage: {
    provider: process.env.CLOUD_STORAGE_PROVIDER,
    bucket: process.env.CLOUD_STORAGE_BUCKET,
    region: process.env.CLOUD_STORAGE_REGION
  },

  // Notification settings
  notifications: {
    email: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    sms: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
    push: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true'
  }
};