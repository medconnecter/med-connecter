const defaultConfig = require('./default');
const productionConfig = require('./production');

const env = process.env.NODE_ENV || 'development';
const config = env === 'production' ? productionConfig : defaultConfig;

// Merge configurations
const finalConfig = {
  ...defaultConfig,
  ...config,
  // Override specific settings based on environment
  swagger: {
    ...defaultConfig.swagger,
    ...config.swagger,
    options: {
      ...defaultConfig.swagger.options,
      ...config.swagger.options
    }
  }
};

module.exports = finalConfig; 