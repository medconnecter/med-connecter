const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Appointment = require('../models/appointment.model');
const { sendEmail, sendSMS } = require('./aws.service');
const snsService = require('./aws/sns.service');
const sqsService = require('./aws/sqs.service');

/**
 * Create and send a notification to a user
 * @param {string} userId - The user's ID
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type ('email', 'sms', 'push')
 * @param {Object} relatedTo - Optional related entity info
 * @returns {Promise<Object>} - The created notification
 */
const sendNotification = async (userId, title, message, type = 'email', relatedTo = null) => {
  try {
    // Create the notification record
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      status: 'pending',
      relatedTo
    });

    // Get the user for contact info
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Send the notification based on type
    if (type === 'email' && user.email) {
      await sendEmail(
        user.email,
        title,
        `<h2>${title}</h2><p>${message}</p>`,
        message
      );
      notification.status = 'sent';
    } else if (type === 'sms' && user.phone) {
      await sendSMS(
        user.phone,
        `${title}: ${message}`
      );
      notification.status = 'sent';
    } else if (type === 'push') {
      // Push notification would be implemented here
      // This is just a placeholder
      notification.status = 'pending';
    } else {
      notification.status = 'failed';
    }

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send appointment reminders for upcoming appointments
 * @returns {Promise<number>} - Number of reminders sent
 */
const sendAppointmentReminders = async () => {
  try {
    // Get appointments happening in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(now.getHours() + 24);

    const upcomingAppointments = await Appointment.find({
      scheduledAt: { $gt: now, $lt: tomorrow },
      status: 'confirmed'
    });

    let reminderCount = 0;

    // Send reminders for each appointment
    for (const appointment of upcomingAppointments) {
      const [patient, doctor] = await Promise.all([
        User.findById(appointment.patientId),
        Doctor.findById(appointment.doctorId).populate('userId')
      ]);

      if (!patient || !doctor) continue;

      // Format appointment time
      const apptTime = new Date(appointment.scheduledAt);
      const timeString = apptTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const dateString = apptTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      // Send patient reminder
      await sendNotification(
        patient._id,
        'Appointment Reminder',
        `You have an appointment with Dr. ${doctor.userId.lastName} tomorrow at ${timeString} on ${dateString}.`,
        'email',
        { model: 'Appointment', id: appointment._id }
      );

      // Send SMS reminder as well
      await sendNotification(
        patient._id,
        'Appointment Reminder',
        `You have an appointment with Dr. ${doctor.userId.lastName} tomorrow at ${timeString}.`,
        'sms',
        { model: 'Appointment', id: appointment._id }
      );

      // Send doctor reminder
      await sendNotification(
        doctor.userId._id,
        'Appointment Reminder',
        `You have an appointment with ${patient.firstName} ${patient.lastName} tomorrow at ${timeString} on ${dateString}.`,
        'email',
        { model: 'Appointment', id: appointment._id }
      );

      reminderCount += 2; // Count both notifications
    }

    return reminderCount;
  } catch (error) {
    console.error('Error sending appointment reminders:', error);
    throw error;
  }
};

/**
 * Get user notifications
 * @param {string} userId - The user's ID
 * @param {number} limit - Max number of notifications to return
 * @param {number} skip - Number of notifications to skip (for pagination)
 * @returns {Promise<Object[]>} - The notifications
 */
const getUserNotifications = async (userId, limit = 20, skip = 0) => {
  try {
    // Get notifications for this user
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return notifications;
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The updated notification
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    // Find the notification
    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    // Mark as read
    notification.read = true;
    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

class NotificationService {
  // Send immediate notification
  async sendNotification (userId, notification) {
    try {
      // Send to SNS topic
      await snsService.publish({
        userId,
        type: notification.type,
        message: notification.message,
        data: notification.data
      });

      // Queue for persistence
      await sqsService.sendMessage({
        type: 'STORE_NOTIFICATION',
        userId,
        notification: {
          ...notification,
          timestamp: new Date().toISOString()
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder (appointment) {
    const message = {
      type: 'APPOINTMENT_REMINDER',
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      datetime: appointment.datetime,
      message: `Reminder: Your appointment is scheduled for ${new Date(appointment.datetime).toLocaleString()}`
    };

    // Send SMS to patient
    if (appointment.patientPhone) {
      await snsService.sendSMS(
        appointment.patientPhone,
        message.message
      );
    }

    // Queue notification for both patient and doctor
    await Promise.all([
      this.sendNotification(appointment.patientId, message),
      this.sendNotification(appointment.doctorId, message)
    ]);
  }

  // Send chat notification
  async sendChatNotification (chatMessage) {
    const notification = {
      type: 'NEW_CHAT_MESSAGE',
      message: `New message from ${chatMessage.senderName}`,
      data: {
        messageId: chatMessage._id,
        senderId: chatMessage.senderId,
        appointmentId: chatMessage.appointmentId
      }
    };

    await this.sendNotification(chatMessage.receiverId, notification);
  }

  // Send payment notification
  async sendPaymentNotification (payment) {
    const notification = {
      type: 'PAYMENT_STATUS',
      message: `Payment ${payment.status} for appointment #${payment.appointmentId}`,
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        status: payment.status
      }
    };

    await Promise.all([
      this.sendNotification(payment.patientId, notification),
      this.sendNotification(payment.doctorId, notification)
    ]);
  }
}

module.exports = new NotificationService();
