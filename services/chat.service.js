
const Chat = require('../models/chat.model');
const mongoose = require('mongoose');

/**
 * Save a message to the database
 * @param {string} appointmentId - The appointment ID
 * @param {string} senderId - The sender's user ID
 * @param {string} content - The message content
 * @param {string} type - The message type (text, file, image)
 * @param {string} fileUrl - Optional file URL for file/image messages
 * @returns {Promise<Object>} - The saved message
 */
const saveMessage = async (appointmentId, senderId, content, type = 'text', fileUrl = null) => {
  try {
    // Find the chat for this appointment
    const chat = await Chat.findOne({ appointmentId });
    if (!chat) {
      throw new Error('Chat not found for this appointment');
    }
    
    // Make sure the sender is a participant
    if (!chat.participants.some(p => p.toString() === senderId.toString())) {
      throw new Error('Sender is not a participant in this chat');
    }
    
    // Create the message
    const message = {
      senderId: mongoose.Types.ObjectId(senderId),
      content,
      type,
      timestamp: new Date()
    };
    
    if (fileUrl && (type === 'file' || type === 'image')) {
      message.fileUrl = fileUrl;
    }
    
    // Add message to chat
    chat.messages.push(message);
    chat.lastActivity = new Date();
    
    await chat.save();
    
    return message;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
};

/**
 * Get messages for a specific appointment
 * @param {string} appointmentId - The appointment ID
 * @param {string} userId - The requesting user's ID
 * @param {number} limit - Max number of messages to return
 * @param {number} skip - Number of messages to skip (for pagination)
 * @returns {Promise<Object[]>} - The messages
 */
const getMessages = async (appointmentId, userId, limit = 50, skip = 0) => {
  try {
    // Find the chat for this appointment
    const chat = await Chat.findOne({ appointmentId });
    if (!chat) {
      throw new Error('Chat not found for this appointment');
    }
    
    // Make sure the user is a participant
    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      throw new Error('User is not a participant in this chat');
    }
    
    // Get messages with pagination
    const messages = chat.messages
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
      .slice(skip, skip + limit)
      .reverse(); // Reverse back to chronological order
    
    return messages;
  } catch (error) {
    console.error('Error retrieving chat messages:', error);
    throw error;
  }
};

/**
 * Mark messages as read for a user
 * @param {string} appointmentId - The appointment ID
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} - Number of messages marked as read
 */
const markMessagesAsRead = async (appointmentId, userId) => {
  try {
    // Find the chat for this appointment
    const chat = await Chat.findOne({ appointmentId });
    if (!chat) {
      throw new Error('Chat not found for this appointment');
    }
    
    // Make sure the user is a participant
    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      throw new Error('User is not a participant in this chat');
    }
    
    // Find messages not sent by this user and mark them as read
    let count = 0;
    chat.messages.forEach(message => {
      if (message.senderId.toString() !== userId.toString() && !message.read) {
        message.read = true;
        count++;
      }
    });
    
    if (count > 0) {
      await chat.save();
    }
    
    return count;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

module.exports = {
  saveMessage,
  getMessages,
  markMessagesAsRead
};
