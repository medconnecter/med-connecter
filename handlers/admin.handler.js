const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const Review = require('../models/review.model');
const BigRegisterService = require('../services/bigRegister.service');

class AdminHandler {
  // Get all pending doctor verifications
  static async getPendingVerifications(req, res) {
    try {
      const doctors = await Doctor.find({ status: 'pending' })
        .populate('userId', 'username email phone firstName lastName');

      res.json({
        success: true,
        data: doctors
      });
    } catch (error) {
      console.error('Error in getPendingVerifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending verifications'
      });
    }
  }

  // Verify doctor profile
  static async verifyDoctorProfile(req, res) {
    try {
      const { doctorId, status, adminComments } = req.body;

      if (!['VERIFIED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }
      if (!adminComments || adminComments.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Admin comments are required for approval or rejection.'
        });
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }

      doctor.status = status;
      doctor.adminComments = adminComments;

      await doctor.save();

      // TODO: Send notification to doctor about verification status

      res.json({
        success: true,
        message: `Doctor profile ${status} successfully`,
        data: doctor
      });
    } catch (error) {
      console.error('Error in verifyDoctorProfile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify doctor profile'
      });
    }
  }

  // Get all doctors
  static async getAllDoctors(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const query = status ? { status } : {};

      const doctors = await Doctor.find(query)
        .populate('userId', 'username email phone firstName lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Doctor.countDocuments(query);

      res.json({
        success: true,
        data: {
          doctors,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error in getAllDoctors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctors'
      });
    }
  }

  // Get doctor details
  static async getDoctorDetails(req, res) {
    try {
      const { doctorId } = req.params;

      const doctor = await Doctor.findById(doctorId)
        .populate('userId', 'username email phone firstName lastName');

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }

      // Get doctor's reviews
      const reviews = await Review.find({ doctorId })
        .populate('patientId', 'username firstName lastName')
        .sort({ createdAt: -1 });

      // Get statistics
      const totalReviews = await Review.countDocuments({ doctorId });
      const verifiedReviews = await Review.countDocuments({ 
        doctorId,
        isVerified: true
      });
      const averageRating = await Review.aggregate([
        { $match: { doctorId, isVerified: true } },
        { $group: { _id: null, average: { $avg: '$rating' } } }
      ]);

      res.json({
        success: true,
        data: {
          doctor,
          reviews,
          statistics: {
            totalReviews,
            verifiedReviews,
            averageRating: averageRating[0]?.average || 0
          }
        }
      });
    } catch (error) {
      console.error('Error in getDoctorDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctor details'
      });
    }
  }

  // Verify review
  static async verifyReview(req, res) {
    try {
      const { reviewId, status, rejectionReason } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      review.status = status;
      review.isVerified = status === 'approved';
      if (status === 'rejected') {
        review.rejectionReason = rejectionReason;
      }

      await review.save();

      // TODO: Send notification to patient about review status

      res.json({
        success: true,
        message: `Review ${status} successfully`,
        data: review
      });
    } catch (error) {
      console.error('Error in verifyReview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify review'
      });
    }
  }

  // Get all pending reviews
  static async getPendingReviews(req, res) {
    try {
      const reviews = await Review.find({ status: 'pending' })
        .populate('doctorId', 'userId')
        .populate('patientId', 'username firstName lastName')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Error in getPendingReviews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending reviews'
      });
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      const totalDoctors = await Doctor.countDocuments();
      const pendingDoctors = await Doctor.countDocuments({ status: 'pending' });
      const totalReviews = await Review.countDocuments();
      const pendingReviews = await Review.countDocuments({ status: 'pending' });
      const totalUsers = await User.countDocuments({ role: 'patient' });

      res.json({
        success: true,
        data: {
          totalDoctors,
          pendingDoctors,
          totalReviews,
          pendingReviews,
          totalUsers
        }
      });
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics'
      });
    }
  }
}

module.exports = AdminHandler; 