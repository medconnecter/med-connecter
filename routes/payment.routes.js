const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
// const { createMollieClient } = require('@mollie/api-client');
const Payment = require('../models/payment.model');
const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const { sendEmail } = require('../services/aws.service');
const PaymentHandler = require('../handlers/payment.handler');
const logger = require('../utils/logger');

// Initialize Mollie client
// const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The payment ID
 *         appointmentId:
 *           type: string
 *           description: Associated appointment ID
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           description: Payment currency
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           description: Current status of the payment
 *         paymentMethod:
 *           type: string
 *           description: Payment method used
 *         transactionId:
 *           type: string
 *           description: External transaction ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the payment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the payment was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management endpoints
 */

/**
 * @swagger
 * /api/payments:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get user's payment history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for payment history
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for payment history
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/Payment'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/payments:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a new payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - amount
 *               - currency
 *               - paymentMethod
 *             properties:
 *               appointmentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: EUR
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, ideal, bank_transfer]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Payment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Payment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Request a refund
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Partial refund amount (optional)
 *     responses:
 *       200:
 *         description: Refund request submitted successfully
 *       400:
 *         description: Invalid input or refund not possible
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to request refund
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Payment webhook handler
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - data
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [payment.succeeded, payment.failed, refund.succeeded]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Server error
 */

/**
 * @route GET /api/payments/:id
 * @desc Get payment status by ID
 * @access Private
 */
router.get('/:id', 
  AuthMiddleware.authenticate,
  PaymentHandler.getPaymentById
);

/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Initiate a payment
 *     description: Start a new payment process for an appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - amount
 *               - currency
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: ID of the appointment
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method to use
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.post('/initiate', 
  AuthMiddleware.authenticate,
  [
    body('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
    body('paymentMethod').isIn(['card', 'bank_transfer']).withMessage('Invalid payment method')
  ],
  async (req, res, next) => {
    try {
      logger.info('Initiating payment', {
        userId: req.user.id,
        appointmentId: req.body.appointmentId,
        paymentMethod: req.body.paymentMethod
      });
      await PaymentHandler.initiatePayment(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details
 *     description: Retrieve details of a specific payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching payment details', {
        userId: req.user.id,
        paymentId: req.params.id
      });
      await PaymentHandler.getPaymentDetails(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/payments/{id}/refund:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Process a refund
 *     description: Initiate a refund for a completed payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for the refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to process refund
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment cannot be refunded
 *       500:
 *         description: Server error
 */
router.post('/:id/refund', 
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  [
    body('reason').isString().withMessage('Refund reason is required')
  ],
  async (req, res, next) => {
    try {
      logger.info('Processing refund', {
        userId: req.user.id,
        paymentId: req.params.id,
        reason: req.body.reason
      });
      await PaymentHandler.processRefund(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Handle payment webhook
 *     description: Process webhook notifications from payment provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - data
 *             properties:
 *               event:
 *                 type: string
 *                 description: Webhook event type
 *               data:
 *                 type: object
 *                 description: Event data
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 *       500:
 *         description: Server error
 */
router.post('/webhook', 
  async (req, res, next) => {
    try {
      logger.info('Processing payment webhook', {
        event: req.body.event
      });
      await PaymentHandler.handleWebhook(req, res);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
