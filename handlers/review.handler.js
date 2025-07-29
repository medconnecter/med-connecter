const Review = require('../models/review.model');
const Appointment = require('../models/appointment.model');
const { validationResult } = require('express-validator');
const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const ReviewHandler = {
  /**
   * Create a new review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createReview (req, res) {
    try {
      const { doctorId, appointmentId, rating, comment } = req.body;
      const userId = req.user.userId;

      // Validate appointment exists and belongs to user
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patientId: userId,
        doctorId,
        status: 'completed'
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found or not eligible for review'
        });
      }

      // Check if review already exists
      const existingReview = await Review.findOne({ appointmentId });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          error: 'Review already exists for this appointment'
        });
      }

      // Create review
      const review = await Review.create({
        doctorId,
        userId,
        appointmentId,
        rating,
        comment
      });

      // Populate user details
      await review.populate('userId', 'firstName lastName avatarUrl');

      res.status(201).json({
        success: true,
        review
      });
    } catch (error) {
      logger.error('Create review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create review'
      });
    }
  },

  /**
   * Get reviews for a specific doctor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDoctorReviews (req, res) {
    try {
      const { doctorId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Validate doctor exists
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get reviews with user details
      const reviews = await Review.find({ doctorId })
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Get total count
      const total = await Review.countDocuments({ doctorId });

      // Calculate average rating
      const ratingStats = await Review.aggregate([
        { $match: { doctorId: doctor._id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: {
                rating: '$rating',
                count: 1
              }
            }
          }
        }
      ]);

      // Format rating distribution
      const ratingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };

      if (ratingStats.length > 0) {
        ratingStats[0].ratingDistribution.forEach(item => {
          ratingDistribution[item.rating] = item.count;
        });
      }

      res.json({
        success: true,
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          averageRating: ratingStats.length > 0 ? ratingStats[0].averageRating : 0,
          totalReviews: ratingStats.length > 0 ? ratingStats[0].totalReviews : 0,
          ratingDistribution
        }
      });
    } catch (error) {
      logger.error('Get doctor reviews error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctor reviews'
      });
    }
  },

  /**
   * Get reviews by a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserReviews (req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get reviews with doctor details
      const reviews = await Review.find({ userId })
        .populate('doctorId', 'firstName lastName specialization avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Get total count
      const total = await Review.countDocuments({ userId });

      res.json({
        success: true,
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get user reviews error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user reviews'
      });
    }
  },

  /**
   * Update a review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateReview (req, res) {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.userId;

      // Find review and check ownership
      const review = await Review.findOne({ _id: reviewId, userId });
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found or unauthorized'
        });
      }

      // Update review
      review.rating = rating;
      review.comment = comment;
      await review.save();

      // Populate user details
      await review.populate('userId', 'firstName lastName avatarUrl');

      res.json({
        success: true,
        review
      });
    } catch (error) {
      logger.error('Update review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update review'
      });
    }
  },

  /**
   * Delete a review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteReview (req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.userId;

      // Find review and check ownership
      const review = await Review.findOne({ _id: reviewId, userId });
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found or unauthorized'
        });
      }

      // Delete review
      await review.remove();

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      logger.error('Delete review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete review'
      });
    }
  },

  async getMyReviews (req, res) {
    try {
      // TODO: Implement get my reviews logic
      res.json({ message: 'My reviews fetched (stub)' });
    } catch (error) {
      console.error('getMyReviews error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = ReviewHandler;
