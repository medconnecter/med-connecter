const express = require('express');
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const Chat = require('../models/chat.model');
const VideoSession = require('../models/video.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const { sendEmail, sendSMS, queueJob } = require('../services/aws.service');
const AppointmentHandler = require('../handlers/appointment.handler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The appointment ID
 *         doctorId:
 *           type: string
 *           description: ID of the doctor
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *         date:
 *           type: string
 *           format: date
 *           description: Appointment date
 *         timeSlot:
 *           type: string
 *           description: Time slot of the appointment
 *         type:
 *           type: string
 *           enum: [in-person, video]
 *           description: Type of appointment
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *           description: Current status of the appointment
 *         reason:
 *           type: string
 *           description: Reason for the appointment
 *         notes:
 *           type: string
 *           description: Doctor's notes about the appointment
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the appointment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the appointment was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management endpoints
 */

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get appointments
 *     description: Retrieve all appointments for the authenticated user (patient or doctor), or for a specific doctor if doctorId is provided as a query parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: false
 *         schema:
 *           type: string
 *         description: Doctor ID (optional, if provided returns appointments for that doctor)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by appointment status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [in-person, video]
 *         description: Filter by appointment type
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
 *         description: List of appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
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
router.get('/', AuthMiddleware.authenticate, AppointmentHandler.getAppointments);

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Create a new appointment
 *     description: Create a new appointment with a doctor. If patientId is not provided, the authenticated user is used as the patient.
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
 *               - date
 *               - timeSlot
 *               - type
 *               - reason
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: ID of the doctor
 *               patientId:
 *                 type: string
 *                 description: (Optional) ID of the patient. If not provided, the authenticated user is used.
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Appointment date (YYYY-MM-DD)
 *               timeSlot:
 *                 type: string
 *                 description: Time slot for the appointment (e.g., 09:00-09:30)
 *               type:
 *                 type: string
 *                 enum: [in-person, video, phone]
 *                 description: Type of appointment
 *               reason:
 *                 type: string
 *                 description: Reason for the appointment
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       409:
 *         description: Time slot not available
 *       500:
 *         description: Server error
 */
router.post('/',
  AuthMiddleware.authenticate,
  [
    body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    body('date').isDate().withMessage('Invalid date format'),
    body('timeSlot').isString().withMessage('Time slot is required'),
    body('type').isIn(['in-person', 'video']).withMessage('Invalid appointment type'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  async (req, res, next) => {
    try {
      logger.info('Creating new appointment', {
        userId: req.user.id,
        doctorId: req.body.doctorId,
        type: req.body.type
      });
      await AppointmentHandler.createAppointment(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get appointment details
 *     description: Retrieve details of a specific appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.get('/:id',
  AuthMiddleware.authenticate,
  async (req, res, next) => {
    try {
      logger.info('Fetching appointment details', {
        userId: req.user.id,
        appointmentId: req.params.id
      });
      await AppointmentHandler.getAppointment(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/{id}/status:
 *   put:
 *     tags:
 *       - Appointments
 *     summary: Update appointment status
 *     description: Update the status of an appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *                 description: New status of the appointment
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctor or patient can update status
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status',
  AuthMiddleware.authenticate,
  [
    body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed'])
      .withMessage('Invalid appointment status')
  ],
  async (req, res, next) => {
    try {
      logger.info('Updating appointment status', {
        userId: req.user.id,
        appointmentId: req.params.id,
        newStatus: req.body.status
      });
      await AppointmentHandler.updateAppointmentStatus(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/{id}/notes:
 *   put:
 *     tags:
 *       - Appointments
 *     summary: Update appointment notes
 *     description: Add or update doctor's notes for an appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Doctor's notes about the appointment
 *     responses:
 *       200:
 *         description: Appointment notes updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctor can update notes
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.put('/:id/notes',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['doctor']),
  [
    body('notes').isString().withMessage('Notes must be a string')
  ],
  async (req, res, next) => {
    try {
      logger.info('Updating appointment notes', {
        userId: req.user.id,
        appointmentId: req.params.id
      });
      await AppointmentHandler.updateAppointmentNotes(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/slots/available:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get available time slots for a date range
 *     description: Get available time slots for a specific doctor for each day in the given date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availability:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       slots:
 *                         type: array
 *                         items:
 *                           type: string
 *                           description: Available time slot
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Server error
 */
router.get('/slots/available',
  AuthMiddleware.authenticate,
  [
    query('doctorId').isMongoId().withMessage('Invalid doctor ID'),
    query('startDate').isDate().withMessage('Invalid start date'),
    query('endDate').isDate().withMessage('Invalid end date')
  ],
  async (req, res, next) => {
    try {
      logger.info('Fetching available slots for range', {
        userId: req.user.id,
        doctorId: req.query.doctorId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      await AppointmentHandler.getAvailableSlotsForRange(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/{id}/reschedule:
 *   put:
 *     tags:
 *       - Appointments
 *     summary: Reschedule an appointment
 *     description: Reschedule an existing appointment to a new date and time
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - date
 *               - timeSlot
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: New appointment date (YYYY-MM-DD)
 *               timeSlot:
 *                 type: string
 *                 description: New time slot
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to reschedule
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: Time slot not available
 *       500:
 *         description: Server error
 */
router.put('/:id/reschedule',
  AuthMiddleware.authenticate,
  [
    body('date').isDate().withMessage('Invalid date format'),
    body('timeSlot').isString().withMessage('Time slot is required')
  ],
  async (req, res, next) => {
    try {
      logger.info('Rescheduling appointment', {
        userId: req.user.id,
        appointmentId: req.params.id,
        newDate: req.body.date,
        newTimeSlot: req.body.timeSlot
      });
      await AppointmentHandler.rescheduleAppointment(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/appointments/{id}/cancel:
 *   put:
 *     tags:
 *       - Appointments
 *     summary: Cancel an appointment
 *     description: Cancel an existing appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to cancel
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: Appointment cannot be cancelled
 *       500:
 *         description: Server error
 */
router.put('/:id/cancel',
  AuthMiddleware.authenticate,
  [
    body('reason').isString().withMessage('Cancellation reason is required')
  ],
  async (req, res, next) => {
    try {
      logger.info('Cancelling appointment', {
        userId: req.user.id,
        appointmentId: req.params.id,
        reason: req.body.reason
      });
      await AppointmentHandler.cancelAppointment(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Helper function to check time slot availability
async function checkTimeSlotAvailability (doctor, appointmentTime) {
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][appointmentTime.getDay()];
  const time = `${appointmentTime.getHours()}:${appointmentTime.getMinutes() < 10 ? '0' : ''}${appointmentTime.getMinutes()}`;

  // Check if day is in doctor's availability
  const daySchedule = doctor.availability.find(schedule => schedule.day === day);
  if (!daySchedule) return false;

  // Check if time is within any slot
  const isTimeInSlot = daySchedule.slots.some(slot => {
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);

    const slotStart = new Date(appointmentTime);
    slotStart.setHours(startHour, startMinute, 0, 0);

    const slotEnd = new Date(appointmentTime);
    slotEnd.setHours(endHour, endMinute, 0, 0);

    return appointmentTime >= slotStart && appointmentTime < slotEnd && !slot.isBooked;
  });

  if (!isTimeInSlot) return false;

  // Check for existing appointments at this time
  const appointmentEnd = new Date(appointmentTime);
  appointmentEnd.setMinutes(appointmentEnd.getMinutes() + 30);

  const existingAppointment = await Appointment.findOne({
    doctorId: doctor._id,
    status: { $nin: ['cancelled'] },
    $or: [
      // New appointment starts during an existing one
      {
        scheduledAt: { $lte: appointmentTime },
        endTime: { $gt: appointmentTime }
      },
      // New appointment ends during an existing one
      {
        scheduledAt: { $lt: appointmentEnd },
        endTime: { $gte: appointmentEnd }
      },
      // New appointment fully contains an existing one
      {
        scheduledAt: { $gte: appointmentTime },
        endTime: { $lte: appointmentEnd }
      }
    ]
  });

  return !existingAppointment;
}

module.exports = router;
