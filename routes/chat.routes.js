const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const Appointment = require('../models/appointment.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const ChatHandler = require('../handlers/chat.handler');
const AWSService = require('../services/aws.service');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The message ID
 *         chatId:
 *           type: string
 *           description: ID of the chat
 *         senderId:
 *           type: string
 *           description: ID of the message sender
 *         content:
 *           type: string
 *           description: Message content
 *         type:
 *           type: string
 *           enum: [text, image, file]
 *           description: Type of message
 *         fileUrl:
 *           type: string
 *           description: URL of attached file (if any)
 *         read:
 *           type: boolean
 *           description: Whether the message has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the message was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the message was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat management endpoints
 */

/**
 * @swagger
 * /api/v1/chats/{appointmentId}:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get chat messages for an appointment
 *     description: Retrieve all messages for a specific appointment chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
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
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:appointmentId', 
  AuthMiddleware.authenticate,
  ChatHandler.getChatMessages
);

/**
 * @swagger
 * /api/v1/chats/{appointmentId}/message:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a text message
 *     description: Send a new text message in the chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - type
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 description: Type of message
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.post('/:appointmentId/message', 
  AuthMiddleware.authenticate,
  [
    body('content').isString().withMessage('Message content must be a string'),
    body('type').isIn(['text', 'image', 'file']).withMessage('Invalid message type')
  ],
  ChatHandler.sendMessage
);

/**
 * @swagger
 * /api/v1/chats/{appointmentId}/file:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Upload a file to chat
 *     description: Upload and attach a file to the chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 5MB)
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       413:
 *         description: File too large
 *       500:
 *         description: Server error
 */
router.post('/:appointmentId/file', 
  AuthMiddleware.authenticate,
  upload.single('file'),
  ChatHandler.uploadFile
);

/**
 * @swagger
 * /api/v1/chats/unread-count:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get unread message count
 *     description: Get the total number of unread messages across all chats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total number of unread messages
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/unread-count', 
  AuthMiddleware.authenticate,
  ChatHandler.getUnreadCount
);

module.exports = router;
