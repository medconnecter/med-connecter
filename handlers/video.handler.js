const VideoSession = require('../models/video.model');
const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const { sendEmail } = require('../services/aws.service');

const VideoHandler = {
  async createSession (req, res) {
    try {
      const { appointmentId } = req.body;
      const userId = req.user.id;

      // Check if appointment exists and user is authorized
      const appointment = await Appointment.findById(appointmentId)
        .populate('doctorId')
        .populate('patientId');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Verify user is either the doctor or patient
      if (appointment.doctorId.userId.toString() !== userId
          && appointment.patientId._id.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to access this appointment' });
      }

      // Check if appointment is scheduled for video consultation
      if (appointment.type !== 'video') {
        return res.status(400).json({ message: 'This appointment is not scheduled for video consultation' });
      }

      // Check if appointment is in the future
      if (new Date(appointment.scheduledAt) > new Date()) {
        return res.status(400).json({ message: 'Cannot start video session before scheduled time' });
      }

      // Create video session
      const session = new VideoSession({
        appointmentId,
        doctorId: appointment.doctorId._id,
        patientId: appointment.patientId._id,
        status: 'active',
        startTime: new Date()
      });

      await session.save();

      // Send email notifications
      const doctorEmail = appointment.doctorId.userId.email;
      const patientEmail = appointment.patientId.email;

      await sendEmail({
        to: doctorEmail,
        subject: 'Video Session Started',
        text: `A video session has started for appointment ID: ${appointmentId}`
      });

      await sendEmail({
        to: patientEmail,
        subject: 'Video Session Started',
        text: `A video session has started for appointment ID: ${appointmentId}`
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Create video session error:', error);
      res.status(500).json({ message: 'Server error creating video session' });
    }
  },

  async endSession (req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const session = await VideoSession.findById(sessionId)
        .populate('appointmentId');

      if (!session) {
        return res.status(404).json({ message: 'Video session not found' });
      }

      // Verify user is either the doctor or patient
      if (session.doctorId.toString() !== userId
          && session.patientId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to end this session' });
      }

      // Update session status
      session.status = 'ended';
      session.endTime = new Date();
      await session.save();

      // Update appointment status if needed
      if (session.appointmentId.status === 'in-progress') {
        session.appointmentId.status = 'completed';
        await session.appointmentId.save();
      }

      res.json({ message: 'Video session ended successfully', session });
    } catch (error) {
      console.error('End video session error:', error);
      res.status(500).json({ message: 'Server error ending video session' });
    }
  },

  async getSessionDetails (req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const session = await VideoSession.findById(sessionId)
        .populate('appointmentId')
        .populate('doctorId')
        .populate('patientId');

      if (!session) {
        return res.status(404).json({ message: 'Video session not found' });
      }

      // Verify user is either the doctor or patient
      if (session.doctorId.userId.toString() !== userId
          && session.patientId._id.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this session' });
      }

      res.json(session);
    } catch (error) {
      console.error('Get session details error:', error);
      res.status(500).json({ message: 'Server error retrieving session details' });
    }
  },

  async joinSession (req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const session = await VideoSession.findById(sessionId)
        .populate('appointmentId');

      if (!session) {
        return res.status(404).json({ message: 'Video session not found' });
      }

      // Verify user is either the doctor or patient
      if (session.doctorId.toString() !== userId
          && session.patientId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to join this session' });
      }

      // Check if session is active
      if (session.status !== 'active') {
        return res.status(400).json({ message: 'Video session is not active' });
      }

      // Generate token for video call
      const token = await generateVideoToken(sessionId, userId);

      res.json({ token, session });
    } catch (error) {
      console.error('Join session error:', error);
      res.status(500).json({ message: 'Server error joining session' });
    }
  }
};

// Helper function to generate video token
async function generateVideoToken (sessionId, userId) {
  // TODO: Implement actual token generation logic with your video provider
  // This is a placeholder that returns a mock token
  return `mock-token-${sessionId}-${userId}-${Date.now()}`;
}

module.exports = VideoHandler;
