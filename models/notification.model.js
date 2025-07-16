
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending'
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Appointment', 'Payment', 'Chat']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
