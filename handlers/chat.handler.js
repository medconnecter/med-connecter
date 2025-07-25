const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const Appointment = require('../models/appointment.model');
const AWSService = require('../services/aws.service');

const ChatHandler = {
  async getChatMessages(req, res) {
    try {
      const { appointmentId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [messages, total] = await Promise.all([
        Message.find({ chatId: appointmentId })
          .populate('senderId', 'firstName lastName avatar')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Message.countDocuments({ chatId: appointmentId })
      ]);
      res.json({
        messages: messages.map(m => ({
          id: m._id,
          chatId: m.chatId,
          senderId: m.senderId,
          content: m.content,
          type: m.type,
          fileUrl: m.fileUrl,
          read: m.read,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt
        })),
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('getChatMessages error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async sendMessage(req, res) {
    try {
      const { appointmentId } = req.params;
      const { content, type } = req.body;
      const senderId = req.user.id;

      // Get appointment to determine doctor and patient
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Find doctor userId
      const doctor = await require('../models/doctor.model').findById(appointment.doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      const doctorUserId = doctor.userId.toString();
      const patientUserId = appointment.patientId.toString();

      // If sender is patient, enforce message limit
      if (senderId === patientUserId) {
        // Find all messages in this chat, sorted by createdAt
        const messages = await Message.find({ chatId: appointmentId }).sort({ createdAt: 1 });
        // Count consecutive patient messages since last doctor reply
        let consecutiveUserMessages = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.senderId.toString() === doctorUserId) {
            break; // Doctor has replied
          }
          if (msg.senderId.toString() === patientUserId) {
            consecutiveUserMessages++;
          } else {
            break;
          }
        }
        if (consecutiveUserMessages >= 3) {
          return res.status(403).json({ message: 'You can only send 3 messages until the doctor replies.' });
        }
      }

      // Create message
      const message = new Message({
        chatId: appointmentId,
        senderId,
        content,
        type
      });
      await message.save();
      await message.populate('senderId', 'firstName lastName avatar');
      res.status(201).json({
        id: message._id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        read: message.read,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      });
    } catch (error) {
      console.error('sendMessage error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async uploadFile(req, res) {
    try {
      const { appointmentId } = req.params;
      const senderId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      // Upload file to S3 using the correct method
      const fileUrl = await AWSService.uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      // Create message
      const message = new Message({
        chatId: appointmentId,
        senderId,
        content: fileUrl,
        type: 'file',
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
      });
      await message.save();
      await message.populate('senderId', 'firstName lastName avatar');
      res.status(201).json({
        id: message._id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        read: message.read,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      });
    } catch (error) {
      console.error('uploadFile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      // Get all chats where user is a participant
      const chats = await Chat.find({
        participants: userId
      });
      // Get unread message count for all chats
      let count = 0;
      for (const chat of chats) {
        count += await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          readBy: { $ne: userId }
        });
      }
      res.json({ count });
    } catch (error) {
      console.error('getUnreadCount error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = ChatHandler; 