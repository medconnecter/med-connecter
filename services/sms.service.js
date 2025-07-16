const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../utils/aws');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    this.snsClient = snsClient;
    // Common country codes with their expected formats
    this.validCountryCodes = {
      '+91': { // India
        length: 10,
        pattern: /^[6-9]\d{9}$/
      },
      '+1': { // USA/Canada
        length: 10,
        pattern: /^\d{10}$/
      },
      '+44': { // UK
        length: 10,
        pattern: /^[1-9]\d{9}$/
      },
      '+61': { // Australia
        length: 9,
        pattern: /^[2-9]\d{8}$/
      }
    };
  }

  validatePhoneNumber(phoneNumber, countryCode) {
    // Validate country code format
    if (!countryCode.startsWith('+')) {
      throw new Error('Country code must start with +');
    }

    // Check if country code is supported
    if (!this.validCountryCodes[countryCode]) {
      throw new Error(`Unsupported country code: ${countryCode}`);
    }

    // Remove any non-digit characters from phone number
    const digits = phoneNumber.replace(/\D/g, '');

    // Validate phone number length and pattern
    const { length, pattern } = this.validCountryCodes[countryCode];
    if (digits.length !== length) {
      throw new Error(`Invalid phone number length for ${countryCode}. Expected ${length} digits.`);
    }

    if (!pattern.test(digits)) {
      throw new Error(`Invalid phone number format for ${countryCode}`);
    }

    return true;
  }

  async sendSMS(phoneNumber, message, countryCode = '+91') {
    try {
      // Validate phone number and country code
      this.validatePhoneNumber(phoneNumber, countryCode);

      // Format phone number to E.164 format
      const formattedNumber = this.formatPhoneNumber(phoneNumber, countryCode);
      logger.info('Sending SMS to:', { formattedNumber, originalNumber: phoneNumber, countryCode });
      
      const params = {
        Message: message,
        PhoneNumber: formattedNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'MEDCONN'
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      const command = new PublishCommand(params);
      const result = await this.snsClient.send(command);
      logger.info('SMS sent successfully:', { messageId: result.MessageId });
      return result;
    } catch (error) {
      logger.error('Error sending SMS:', {
        message: error.message,
        code: error.code,
        requestId: error.$metadata?.requestId,
        phoneNumber: phoneNumber,
        countryCode: countryCode
      });
      throw error;
    }
  }

  async sendOTP(phoneNumber, otp, countryCode = '+91') {
    const message = `Your Med Connecter verification code is: ${otp}. This code will expire in 5 minutes.`;
    return this.sendSMS(phoneNumber, message, countryCode);
  }

  async sendWelcomeSMS(phoneNumber, firstName, countryCode = '+91') {
    const message = `Welcome to Med Connecter, ${firstName}! Thank you for joining our platform. Please verify your phone number to get started.`;
    return this.sendSMS(phoneNumber, message, countryCode);
  }

  async sendVerificationSMS(phoneNumber, countryCode = '+91') {
    const message = 'Please verify your phone number to complete your registration on Med Connecter.';
    return this.sendSMS(phoneNumber, message, countryCode);
  }

  async sendAppointmentReminder(phoneNumber, appointmentDetails, countryCode = '+91') {
    const message = `Reminder: You have an appointment with Dr. ${appointmentDetails.doctorName} on ${appointmentDetails.date} at ${appointmentDetails.time}.`;
    return this.sendSMS(phoneNumber, message, countryCode);
  }

  formatPhoneNumber(phoneNumber, countryCode) {
    // Remove any non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If the number starts with 0, replace it with the country code
    if (digits.startsWith('0')) {
      return `${countryCode}${digits.slice(1)}`;
    }
    
    // If the number doesn't start with +, add the country code
    if (!phoneNumber.startsWith('+')) {
      return `${countryCode}${digits}`;
    }
    
    // If the number already has a country code, return as is
    return phoneNumber;
  }
}

module.exports = new SMSService(); 