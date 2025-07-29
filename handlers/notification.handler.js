const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { sendEmail } = require('../services/aws.service');
const { NotFoundError, ValidationError } = require('../utils/error.handler');
const logger = require('../utils/logger');

const NotificationHandler = {
  async getNotifications (req, res) {
    const { type, read, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    // Build query
    const query = { userId };
    if (type) query.type = type;
    if (read !== undefined) query.read = read === 'true';

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Get total count
    const total = await Notification.countDocuments(query);

    logger.info('Notifications retrieved successfully', {
      userId,
      count: notifications.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });

    res.json({
      notifications,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  },

  async markAsRead (req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    notification.read = true;
    await notification.save();

    logger.info('Notification marked as read', {
      userId,
      notificationId: id
    });

    res.json({ message: 'Notification marked as read', notification });
  },

  async markAllAsRead (req, res) {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    logger.info('All notifications marked as read', {
      userId,
      modifiedCount: result.modifiedCount
    });

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  },

  async deleteNotification (req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    logger.info('Notification deleted', {
      userId,
      notificationId: id
    });

    res.json({ message: 'Notification deleted successfully' });
  },

  async sendTestNotification (req, res) {
    const { userId, title, message, type } = req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create notification
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      read: false
    });

    await notification.save();

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: title,
      text: message
    });

    logger.info('Test notification sent', {
      adminId: req.user.id,
      targetUserId: userId,
      type,
      notificationId: notification._id
    });

    res.status(201).json({
      message: 'Test notification sent successfully',
      notification
    });
  }
};

module.exports = NotificationHandler;
