const { v4: uuidv4 } = require('uuid');
const VideoSession = require('../models/video.session.model');
const User = require('../models/user.model');
// const twilio = require('twilio');

// Initialize Twilio client
// const twilioClient = twilio(
//   process.env.TWILIO_API_KEY,
//   process.env.TWILIO_API_SECRET,
//   { accountSid: process.env.TWILIO_ACCOUNT_SID }
// );

/**
 * Create a new video session
 * @param {string} doctorId - Doctor's user ID
 * @param {string} patientId - Patient's user ID
 * @param {Date} scheduledAt - Scheduled time for the session
 * @returns {Promise<Object>} Video session details
 */
async function createVideoSession (doctorId, patientId, scheduledAt) {
  try {
    // Verify users exist
    const [doctor, patient] = await Promise.all([
      User.findById(doctorId),
      User.findById(patientId)
    ]);

    if (!doctor || !patient) {
      throw new Error('Doctor or patient not found');
    }

    // Create a mock room for development
    const roomId = `dev-room-${uuidv4()}`;

    // Create video session record
    const videoSession = new VideoSession({
      roomId,
      doctorId,
      patientId,
      scheduledAt,
      status: 'scheduled',
      provider: 'mock' // Changed from 'twilio' to 'mock'
    });

    await videoSession.save();

    return {
      sessionId: videoSession._id,
      roomId,
      token: `mock-token-${uuidv4()}`, // Mock token for development
      status: 'scheduled'
    };
  } catch (error) {
    console.error('Error creating video session:', error);
    throw error;
  }
}

/**
 * Join an existing video session
 * @param {string} sessionId - Video session ID
 * @param {string} userId - User ID of the participant
 * @returns {Promise<Object>} Session access details
 */
async function joinVideoSession (sessionId, userId) {
  try {
    const session = await VideoSession.findById(sessionId);
    if (!session) {
      throw new Error('Video session not found');
    }

    // Verify user is authorized to join
    if (userId !== session.doctorId.toString() && userId !== session.patientId.toString()) {
      throw new Error('Unauthorized to join this session');
    }

    // For development, return mock credentials
    return {
      roomId: session.roomId,
      token: `mock-token-${uuidv4()}`,
      status: session.status
    };
  } catch (error) {
    console.error('Error joining video session:', error);
    throw error;
  }
}

/**
 * End a video session
 * @param {string} sessionId - Video session ID
 * @returns {Promise<Object>} Updated session details
 */
async function endVideoSession (sessionId) {
  try {
    const session = await VideoSession.findById(sessionId);
    if (!session) {
      throw new Error('Video session not found');
    }

    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();

    return {
      sessionId: session._id,
      status: 'ended',
      endedAt: session.endedAt
    };
  } catch (error) {
    console.error('Error ending video session:', error);
    throw error;
  }
}

module.exports = {
  createVideoSession,
  joinVideoSession,
  endVideoSession
};
