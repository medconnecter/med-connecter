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
    path: '/api-docs',
    options: {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Zorg Connect API',
          version: '1.0.0',
          description: 'Production API documentation for Zorg Connect platform',
          contact: {
            name: 'API Support',
            email: 'support@zorgconnect.nl'
          }
        },
        servers: [
          {
            url: process.env.API_URL,
            description: 'Production server'
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
      apis: ['./docs/swagger/*.js']
    }
  }
}; 