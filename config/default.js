module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8085,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/med-connecter',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: '24h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined'
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: '/medconnecter/api-docs',
    options: {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Med Connecter API',
          version: '1.0.0',
          description: 'API documentation for Med Connecter platform',
          contact: {
            name: 'API Support',
            email: 'support@medconnecter.com'
          }
        },
        servers: [
          {
            url: process.env.API_URL || 'http://localhost:8085/medconnecter',
            description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter your JWT token in the format: Bearer <token>'
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ],
        tags: [
          {
            name: 'Auth',
            description: 'Authentication and authorization endpoints'
          },
          {
            name: 'Users',
            description: 'User management endpoints'
          },
          {
            name: 'Doctors',
            description: 'Doctor management endpoints'
          },
          {
            name: 'Appointments',
            description: 'Appointment management endpoints'
          },
          {
            name: 'Reviews',
            description: 'Doctor review management endpoints'
          },
          {
            name: 'Recommendations',
            description: 'Doctor recommendation and search endpoints'
          },
          {
            name: 'Payments',
            description: 'Payment processing endpoints'
          },
          {
            name: 'Notifications',
            description: 'Notification management endpoints'
          },
          {
            name: 'Admin',
            description: 'Admin management endpoints'
          }
        ]
      },
      apis: ['./routes/*.js', './docs/swagger.js'] // Path to the API docs
    }
  }
};
