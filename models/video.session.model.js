const mongoose = require('mongoose');

const videoSessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  provider: {
    type: String,
    enum: ['mock', 'twilio', 'webrtc'],
    default: 'mock'
  },
  recordingUrl: {
    type: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
videoSessionSchema.index({ doctorId: 1, scheduledAt: 1 });
videoSessionSchema.index({ patientId: 1, scheduledAt: 1 });
videoSessionSchema.index({ status: 1 });

// Add methods if needed
videoSessionSchema.methods.isActive = function () {
  return this.status === 'active';
};

videoSessionSchema.methods.canJoin = function () {
  return ['scheduled', 'active'].includes(this.status);
};

videoSessionSchema.methods.getDuration = function () {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000);
  }
  return 0;
};

// Prevent model overwrite error by checking if it exists first
const VideoSession = mongoose.models.VideoSession || mongoose.model('VideoSession', videoSessionSchema);

module.exports = VideoSession;
