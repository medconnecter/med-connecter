const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const VideoSession = require('../models/video.model');
const Appointment = require('../models/appointment.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const VideoHandler = require('../handlers/video.handler');
const videoService = require('../services/video.service');
const logger = require('../utils/logger');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     VideoSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The video session ID
 *         appointmentId:
 *           type: string
 *           description: Associated appointment ID
 *         doctorId:
 *           type: string
 *           description: ID of the doctor
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *         status:
 *           type: string
 *           enum: [scheduled, active, ended]
 *           description: Current status of the session
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: When the session started
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: When the session ended
 *         recordingUrl:
 *           type: string
 *           description: URL to the session recording (if available)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the session was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the session was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Video
 *   description: Video consultation endpoints
 */

/**
 * @swagger
 * /api/v1/video/sessions:
 *   get:
 *     tags:
 *       - Video
 *     summary: Get user's video sessions
 *     description: Retrieve all video sessions for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, ended]
 *         description: Filter by session status
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
 *         description: Video sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VideoSession'
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
router.get('/sessions',
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching video sessions', {
        userId: req.user.id,
        query: req.query
      });
      await VideoHandler.getSessions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/video/sessions:
 *   post:
 *     tags:
 *       - Video
 *     summary: Create a new video session
 *     description: Create a new video consultation session for an appointment
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
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: ID of the associated appointment
 *     responses:
 *       201:
 *         description: Video session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoSession'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: Video session already exists for this appointment
 *       500:
 *         description: Server error
 */
router.post('/sessions',
  AuthMiddleware.authenticate,
  [
    body('appointmentId').isMongoId().withMessage('Invalid appointment ID')
  ],
  async (req, res, next) => {
    try {
      logger.info('Creating video session', {
        userId: req.user.id,
        appointmentId: req.body.appointmentId
      });
      await VideoHandler.createSession(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/video/sessions:
 *   post:
 *     tags:
 *       - Video
 *     summary: Create a new video session
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
 *             properties:
 *               appointmentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/VideoSession'
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
 * /api/video/sessions/{id}:
 *   get:
 *     tags:
 *       - Video
 *     summary: Get video session details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Video session details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/VideoSession'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video session not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/video/sessions/{id}/join:
 *   post:
 *     tags:
 *       - Video
 *     summary: Join a video session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Successfully joined video session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 roomName:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to join this session
 *       404:
 *         description: Video session not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/video/sessions/{id}/end:
 *   post:
 *     tags:
 *       - Video
 *     summary: End a video session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Video session ended successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to end this session
 *       404:
 *         description: Video session not found
 *       500:
 *         description: Server error
 */

/**
 * @route POST /api/video/session
 * @desc Create a new video session
 * @access Private
 */
router.post('/session', 
  AuthMiddleware.authenticate,
  [
    body('appointmentId').isMongoId().withMessage('Invalid appointment ID')
  ],
  async (req, res, next) => {
    try {
      logger.info('Creating video session', {
        userId: req.user.id,
        appointmentId: req.body.appointmentId
      });
      await VideoHandler.createSession(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/video/join/:sessionId
 * @desc Join a video session
 * @access Private
 */
router.post('/join/:sessionId', 
  AuthMiddleware.authenticate,
  VideoHandler.joinSession
);

/**
 * @route POST /api/video/end/:sessionId
 * @desc End a video session
 * @access Private
 */
router.post('/end/:sessionId', 
  AuthMiddleware.authenticate,
  VideoHandler.endSession
);

/**
 * @swagger
 * /api/v1/video/sessions/{sessionId}:
 *   get:
 *     tags:
 *       - Video
 *     summary: Get session details
 *     description: Retrieve details of a specific video session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video session ID
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoSession'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view session
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get('/sessions/:sessionId', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching video session details', {
        userId: req.user.id,
        sessionId: req.params.sessionId
      });
      await VideoHandler.getSessionDetails(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/video/sessions/{sessionId}/join:
 *   post:
 *     tags:
 *       - Video
 *     summary: Join a video session
 *     description: Join an active video consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video session ID
 *     responses:
 *       200:
 *         description: Successfully joined the session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token for joining the video session
 *                 sessionId:
 *                   type: string
 *                   description: Video session ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to join session
 *       404:
 *         description: Session not found
 *       409:
 *         description: Session is not active
 *       500:
 *         description: Server error
 */
router.post('/sessions/:sessionId/join', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Joining video session', {
        userId: req.user.id,
        sessionId: req.params.sessionId
      });
      await VideoHandler.joinSession(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/video/sessions/{sessionId}/end:
 *   post:
 *     tags:
 *       - Video
 *     summary: End a video session
 *     description: End an active video consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video session ID
 *     responses:
 *       200:
 *         description: Session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoSession'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to end session
 *       404:
 *         description: Session not found
 *       409:
 *         description: Session is not active
 *       500:
 *         description: Server error
 */
router.post('/sessions/:sessionId/end', 
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Ending video session', {
        userId: req.user.id,
        sessionId: req.params.sessionId
      });
      await VideoHandler.endSession(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/video/sessions/{sessionId}/recording:
 *   get:
 *     tags:
 *       - Video
 *     summary: Get session recording
 *     description: Get the recording URL for a completed video session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video session ID
 *     responses:
 *       200:
 *         description: Recording URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recordingUrl:
 *                   type: string
 *                   description: URL to access the session recording
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to access recording
 *       404:
 *         description: Session not found
 *       409:
 *         description: Recording not available
 *       500:
 *         description: Server error
 */
router.get('/sessions/:sessionId/recording',
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching session recording', {
        userId: req.user.id,
        sessionId: req.params.sessionId
      });
      await VideoHandler.getSessionRecording(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/video/sessions/{sessionId}/chat:
 *   get:
 *     tags:
 *       - Video
 *     summary: Get session chat history
 *     description: Get the chat history for a video session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video session ID
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       senderId:
 *                         type: string
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to access chat
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.get('/sessions/:sessionId/chat',
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching session chat history', {
        userId: req.user.id,
        sessionId: req.params.sessionId
      });
      await VideoHandler.getSessionChat(req, res);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
