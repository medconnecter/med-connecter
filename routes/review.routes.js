const express = require('express');
const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');
const Review = require('../models/review.model');
const Appointment = require('../models/appointment.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const ReviewHandler = require('../handlers/review.handler');
const logger = require('../utils/logger');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The review ID
 *         doctorId:
 *           type: string
 *           description: ID of the doctor being reviewed
 *         patientId:
 *           type: string
 *           description: ID of the patient writing the review
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating given (1-5)
 *         comment:
 *           type: string
 *           description: Review comment
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the review was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the review was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management endpoints
 */

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - appointmentId
 *               - rating
 *               - comment
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: ID of the doctor being reviewed
 *               appointmentId:
 *                 type: string
 *                 description: ID of the completed appointment
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Review comment
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input or review already exists
 *       404:
 *         description: Appointment not found or not eligible
 *       500:
 *         description: Server error
 */
router.post('/',
  AuthMiddleware.authenticate,
  validate([
    body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    body('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
  ]),
  ReviewHandler.createReview
);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Updated rating from 1 to 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Updated review comment
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       404:
 *         description: Review not found or unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id',
  AuthMiddleware.authenticate,
  validate([
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
  ]),
  ReviewHandler.updateReview
);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the review to delete
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found or unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id',
  AuthMiddleware.authenticate,
  validate([
    param('id').isMongoId().withMessage('Invalid review ID')
  ]),
  ReviewHandler.deleteReview
);

/**
 * @swagger
 * /api/v1/reviews/doctor/{doctorId}:
 *   get:
 *     summary: Get reviews for a specific doctor
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the doctor
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
 *         description: List of reviews with pagination and stats
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Server error
 */
router.get('/doctor/:doctorId',
  AuthMiddleware.authenticate,
  validate([
    param('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  ReviewHandler.getDoctorReviews
);

/**
 * @swagger
 * /api/v1/reviews/user:
 *   get:
 *     summary: Get reviews by the authenticated user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of user's reviews with pagination
 *       500:
 *         description: Server error
 */
router.get('/user',
  AuthMiddleware.authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  ReviewHandler.getUserReviews
);

module.exports = router;
