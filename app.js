require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('config');

const logger = require('./utils/logger');
const { errorHandler } = require('./utils/error.handler');
const versionMiddleware = require('./middleware/version.middleware');
const sessionMiddleware = require('./middleware/session.middleware');
const AuthMiddleware = require('./middleware/auth.middleware');

// Debug environment variables
logger.info('Environment variables:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? '***' : undefined,
  CONFIG_PORT: config.get('port')
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const reviewRoutes = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');
const paymentRoutes = require('./routes/payment.routes');
const chatRoutes = require('./routes/chat.routes');
const videoRoutes = require('./routes/video.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.set('trust proxy', true);
// Debug middleware to log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Log the masked connection string for debugging
    const maskedUri = process.env.MONGODB_URI.replace(/(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)(@.*)/, '$1****$4');
    logger.info('Attempting to connect to MongoDB:', { uri: maskedUri });

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority'
    });
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    // Log more details about the error
    if (err.name === 'MongoServerSelectionError') {
      logger.error('Server selection error details:', {
        message: err.message,
        reason: err.reason,
        topology: err.topology?.description
      });
    }
  }
};

// Call the connection function
connectDB();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Disable Helmet for development

app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8085',
      'http://127.0.0.1:8085',
      'https://med-connecter-alb-1852861701.eu-north-1.elb.amazonaws.com',
      'http://med-connecter-alb-1852861701.eu-north-1.elb.amazonaws.com',
      // Add dynamic origins based on environment
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values

    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-session-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Swagger configuration
const swaggerOptions = config.get('swagger.options');

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Debug Swagger spec generation
logger.info('Swagger spec generated:', {
  paths: Object.keys(swaggerSpec.paths || {}),
  totalPaths: Object.keys(swaggerSpec.paths || {}).length,
  hasComponents: !!swaggerSpec.components,
  hasSecurity: !!swaggerSpec.security
});

// Add custom operation filter to ensure bearer auth is included
Object.keys(swaggerSpec.paths).forEach(path => {
  Object.keys(swaggerSpec.paths[path]).forEach(method => {
    const operation = swaggerSpec.paths[path][method];
    operation.security = [{
      bearerAuth: []
    }];
  });
});

// Create a router for the medconnecter context path
const medconnecterRouter = express.Router();

// Add debugging middleware to log all requests to medconnecter router
medconnecterRouter.use((req, res, next) => {
  logger.info(`MedConnecter Router: ${req.method} ${req.path}`);
  next();
});

// Swagger documentation with custom options
if (config.get('swagger.enabled')) {
  medconnecterRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Med Connecter API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }));

  // Add endpoint to get Swagger JSON
  medconnecterRouter.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
} else {
  logger.warn('Swagger documentation is disabled');
  medconnecterRouter.get('/api-docs', (req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'API documentation is disabled',
      availableEndpoints: {
        health: '/medconnecter/health',
        api: '/medconnecter/api/v1'
      }
    });
  });
}

app.use(helmet({
  contentSecurityPolicy: false
}));

// Add debugging route for API docs
medconnecterRouter.get('/api-docs-debug', (req, res) => {
  logger.info('API docs debug route hit');
  res.json({
    message: 'API docs debug endpoint',
    swaggerEnabled: config.get('swagger.enabled'),
    swaggerSpec: !!swaggerSpec,
    paths: Object.keys(swaggerSpec.paths || {}),
    availableRoutes: [
      '/medconnecter/api-docs',
      '/medconnecter/api-docs.json',
      '/medconnecter/health',
      '/medconnecter/api/v1'
    ]
  });
});

// Health check endpoint
medconnecterRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for medconnecter
medconnecterRouter.get('/', (req, res) => {
  res.json({
    message: 'Med Connecter API',
    version: '1.0.0',
    endpoints: {
      apiDocs: '/medconnecter/api-docs',
      health: '/medconnecter/health',
      api: '/medconnecter/api/v1'
    }
  });
});

// Debug middleware to log API routes
medconnecterRouter.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    logger.info(`API Request: ${req.method} ${req.path}`);
  }
  next();
});

medconnecterRouter.use('/api/v1', AuthMiddleware.blockDeactivated);
medconnecterRouter.use('/api/v1', versionMiddleware);
medconnecterRouter.use('/api/v1', sessionMiddleware);

// Mount routes
medconnecterRouter.use('/api/v1/auth', authRoutes);
medconnecterRouter.use('/api/v1/users', userRoutes);
medconnecterRouter.use('/api/v1/doctors', doctorRoutes);
medconnecterRouter.use('/api/v1/appointments', appointmentRoutes);
medconnecterRouter.use('/api/v1/reviews', reviewRoutes);
medconnecterRouter.use('/api/v1/notifications', notificationRoutes);
medconnecterRouter.use('/api/v1/payments', paymentRoutes);
medconnecterRouter.use('/api/v1/chats', chatRoutes);
medconnecterRouter.use('/api/v1/video', videoRoutes);
medconnecterRouter.use('/api/v1/admin', adminRoutes);

// Mount the medconnecter router under /medconnecter path
app.use('/medconnecter', medconnecterRouter);

// Health check at root for ALB
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a catch-all route for debugging
app.use('*', (req, res, next) => {
  logger.info(`Catch-all route hit: ${req.method} ${req.originalUrl}`);
  logger.info('Request headers:', req.headers);
  next();
});

// Error handling middleware
app.use(errorHandler);

// Handle 404 errors
app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      apiDocs: '/medconnecter/api-docs',
      health: '/medconnecter/health',
      api: '/medconnecter/api/v1'
    }
  });
});

// Start server
const PORT = process.env.PORT || 8085;
logger.info(`Attempting to start server on port ${PORT}`);
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Swagger documentation available at http://localhost:${PORT}/medconnecter/api-docs`);
  logger.info(`Health check available at http://localhost:${PORT}/medconnecter/health`);
  logger.info(`API base URL: http://localhost:${PORT}/medconnecter/api/v1`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

module.exports = app;
