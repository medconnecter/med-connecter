const axios = require('axios');
const config = require('../config/config');

class BigRegisterService {
  static async verifyRegistrationNumber(registrationNumber) {
    try {
      // TODO: Implement actual BIG-register API integration
      // For now, we'll just validate the format
      // if (!registrationNumber || !/^\d{9}$/.test(registrationNumber)) {
      //   return {
      //     isValid: false,
      //     error: 'Invalid registration number format'
      //   };
      // }

      // // Simulate API call
      // const response = await axios.get(`${config.bigRegisterApiUrl}/verify`, {
      //   headers: {
      //     'Authorization': `Bearer ${config.bigRegisterApiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   params: {
      //     registrationNumber
      //   }
      // });

      return {
        success: true,
        data: null
      };
    } catch (error) {
      console.error('Error verifying registration number:', error);
      return {
        isValid: false,
        error: 'Failed to verify registration number'
      };
    }
  }

  static async getSpecializations() {
    try {
      const response = await axios.get(`${config.bigRegister.apiUrl}/specializations`, {
        params: {
          apiKey: config.bigRegister.apiKey
        }
      });

      if (response.data.success) {
        return {
          success: true,
          specializations: response.data.specializations
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to fetch specializations'
      };
    } catch (error) {
      console.error('BIG-register API error:', error);
      return {
        success: false,
        error: 'Failed to fetch specializations'
      };
    }
  }
}

module.exports = BigRegisterService; 