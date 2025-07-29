const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('../models/user.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const UserHandler = require('../handlers/user.handler');
const AWSService = require('../services/aws.service');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         dob:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *         languages:
 *           type: array
 *           items:
 *             type: string
 */

// Configure multer for memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/profile',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['patient', 'admin', 'doctor']),
  UserHandler.getProfile
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/profile',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['patient', 'admin', 'doctor']),
  [
    body('firstName').exists().isString().withMessage('First name is required'),
    body('lastName').exists().isString().withMessage('Last name is required'),
    body('dob').exists().isISO8601().withMessage('Date of birth is required and must be a valid date'),
    body('gender').exists().isIn(['male', 'female', 'other']).withMessage('Gender is required and must be one of male, female, other'),
    body('phone').exists().isObject().withMessage('Phone is required').custom(phone => phone && phone.number && phone.countryCode),
    body('address').exists().isObject().withMessage('Address is required'),
    body('address.street').exists().isString().withMessage('Street is required'),
    body('address.city').exists().isString().withMessage('City is required'),
    body('address.state').exists().isString().withMessage('State is required'),
    body('address.country').exists().isString().withMessage('Country is required'),
    body('address.postalCode').exists().isString().withMessage('Postal code is required'),
    body('languages').exists().isArray({ min: 1 }).withMessage('Languages must be a non-empty array')
  ],
  UserHandler.updateProfile
);

/**
 * @swagger
 * /api/v1/users/profile/picture:
 *   post:
 *     summary: Update profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/profile/picture',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['patient', 'admin', 'doctor']),
  upload.single('picture'),
  UserHandler.updateProfilePicture
);

/**
 * @swagger
 * /api/v1/users/deactivate/{userId}:
 *   post:
 *     summary: Deactivate a user (self or admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user to deactivate
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Not authorized to deactivate this user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// Deactivate user (self or admin)
router.post('/deactivate/:userId', AuthMiddleware.authenticate, AuthMiddleware.authorize(['patient', 'admin', 'doctor']), UserHandler.deactivateUser);

module.exports = router;
