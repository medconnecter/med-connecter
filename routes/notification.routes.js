const express = require('express');
const { body } = require('express-validator');
const AuthMiddleware = require('../middleware/auth.middleware');
const NotificationHandler = require('../handlers/notification.handler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The notification ID
 *         userId:
 *           type: string
 *           description: ID of the user receiving the notification
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [appointment, payment, system]
 *           description: Type of notification
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get user's notifications
 *     description: Retrieve all notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [appointment, payment, system]
 *         description: Filter by notification type
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter by read status
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
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
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
router.get('/', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching user notifications', {
        userId: req.user.id,
        query: req.query
      });
      await NotificationHandler.getNotifications(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/:id/read', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Marking notification as read', {
        userId: req.user.id,
        notificationId: req.params.id
      });
      await NotificationHandler.markAsRead(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     description: Mark all notifications for the authenticated user as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                   description: Number of notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/read-all', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Marking all notifications as read', {
        userId: req.user.id
      });
      await NotificationHandler.markAllAsRead(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Delete a notification
 *     description: Delete a specific notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Deleting notification', {
        userId: req.user.id,
        notificationId: req.params.id
      });
      await NotificationHandler.deleteNotification(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/notifications/send-test:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Send test notification
 *     description: Send a test notification to the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [appointment, payment, system]
 *                 description: Type of notification
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/send-test', 
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('title').isString().withMessage('Title must be a string'),
    body('message').isString().withMessage('Message must be a string'),
    body('type').isIn(['info', 'success', 'warning', 'error']).withMessage('Invalid notification type')
  ],
  async (req, res, next) => {
    try {
      logger.info('Sending test notification', {
        adminId: req.user.id,
        targetUserId: req.body.userId,
        type: req.body.type
      });
      await NotificationHandler.sendTestNotification(req, res);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
