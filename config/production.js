module.exports = {
  env: 'production',
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 50 // stricter rate limit in production
  },
  logging: {
    level: 'warn',
    format: 'combined'
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: '/medconnecter/api-docs',
    options: {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Med Connecter API',
          version: '1.0.0',
          description: 'Production API documentation for Med Connecter platform',
          contact: {
            name: 'API Support',
            email: 'support@medconnecter.com'
          }
        },
        servers: [
          {
            url: process.env.API_URL ? `${process.env.API_URL}/medconnecter` : 'https://med-connecter-alb-1852861701.eu-north-1.elb.amazonaws.com/medconnecter',
            description: 'Production server'
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
      apis: ['./routes/*.js', './docs/swagger.js']
    }
  }
};
