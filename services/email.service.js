const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor () {
    this.transporter = null;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    this.initializeTransporter();
  }

  async initializeTransporter (retryCount = 0) {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 30000, // Increased to 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
        debug: process.env.NODE_ENV === 'development',
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // How many messages to send per second
        rateLimit: 5, // Max number of messages per rateDelta
        logger: true // Enable logging
      });

      // Verify connection configuration
      await new Promise((resolve, reject) => {
        this.transporter.verify((error, success) => {
          if (error) {
            logger.error('SMTP connection error:', {
              error: error.message,
              code: error.code,
              command: error.command,
              retryCount
            });

            if (retryCount < this.maxRetries) {
              logger.info(`Retrying SMTP connection (${retryCount + 1}/${this.maxRetries})...`);
              setTimeout(() => {
                this.initializeTransporter(retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, this.retryDelay);
            } else {
              reject(error);
            }
          } else {
            logger.info('SMTP server is ready to take our messages');
            resolve(success);
          }
        });
      });
    } catch (error) {
      logger.error('Error initializing SMTP transporter:', {
        error: error.message,
        code: error.code,
        command: error.command,
        retryCount
      });

      if (retryCount < this.maxRetries) {
        logger.info(`Retrying SMTP initialization (${retryCount + 1}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.initializeTransporter(retryCount + 1);
      }
      throw error;
    }
  }

  async sendEmail ({ to, subject, text, html }, retryCount = 0) {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      logger.error('Error sending email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        retryCount
      });

      if (retryCount < this.maxRetries) {
        logger.info(`Retrying email send (${retryCount + 1}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.sendEmail({ to, subject, text, html }, retryCount + 1);
      }
      throw error;
    }
  }

  async sendVerificationEmail (to, token) {
    const subject = 'Verify Your Email';
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `;
    const text = `Please visit ${verificationUrl} to verify your email address. This link will expire in 24 hours.`;

    return this.sendEmail({ to, subject, text, html });
  }

  async sendPasswordResetEmail (to, token) {
    const subject = 'Reset Your Password';
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <h1>Password Reset</h1>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `;
    const text = `Please visit ${resetUrl} to reset your password. This link will expire in 1 hour.`;

    return this.sendEmail({ to, subject, text, html });
  }

  async sendAppointmentConfirmation (to, appointmentDetails) {
    const subject = 'Appointment Confirmation';
    const html = `
      <h1>Appointment Confirmed</h1>
      <p>Your appointment has been confirmed with the following details:</p>
      <ul>
        <li>Date: ${appointmentDetails.date}</li>
        <li>Time: ${appointmentDetails.time}</li>
        <li>Doctor: ${appointmentDetails.doctorName}</li>
        <li>Type: ${appointmentDetails.type}</li>
      </ul>
    `;
    const text = `Your appointment has been confirmed for ${appointmentDetails.date} at ${appointmentDetails.time} with Dr. ${appointmentDetails.doctorName}.`;

    return this.sendEmail({ to, subject, text, html });
  }

  async sendOTP (to, otp) {
    const subject = 'Your OTP Code';
    const html = `
      <h1>Your OTP Code</h1>
      <p>Your One-Time Password (OTP) is:</p>
      <h2 style="font-size: 24px; color: #4CAF50; padding: 10px; background: #f5f5f5; text-align: center;">${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
    `;
    const text = `Your OTP is: ${otp}. This OTP is valid for 10 minutes. If you didn't request this OTP, please ignore this email.`;

    return this.sendEmail({ to, subject, text, html });
  }
}

module.exports = new EmailService();
