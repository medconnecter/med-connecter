module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8085,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/zorg-connect',
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
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: '/api-docs',
    options: {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Zorg Connect API',
          version: '1.0.0',
          description: 'API documentation for Zorg Connect platform',
          contact: {
            name: 'API Support',
            email: 'support@zorgconnect.nl'
          }
        },
        servers: [
          {
            url: process.env.API_URL || 'http://localhost:8080',
            description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
          }
        ],
        tags: [
          {
            name: 'Recommendations',
            description: 'Doctor recommendation and search endpoints'
          },
          {
            name: 'Reviews',
            description: 'Doctor review management endpoints'
          }
        ]
      },
      apis: ['./docs/swagger/*.js'] // Path to the API docs
    }
  }
};
