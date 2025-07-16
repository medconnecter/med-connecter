const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ appointmentId: 1 }, { unique: true });

// Ensure one review per appointment
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingReview = await this.constructor.findOne({ appointmentId: this.appointmentId });
    if (existingReview) {
      throw new Error('A review already exists for this appointment');
    }
  }
  next();
});

// Update doctor's average rating after review changes
reviewSchema.statics.updateDoctorRating = async function(doctorId) {
  const result = await this.aggregate([
    { $match: { doctorId: mongoose.Types.ObjectId(doctorId) } },
    {
      $group: {
        _id: '$doctorId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    await mongoose.model('Doctor').findByIdAndUpdate(doctorId, {
      'ratings.average': result[0].averageRating,
      'ratings.count': result[0].totalReviews
    });
  }
};

// Update doctor rating after save/remove
reviewSchema.post('save', function() {
  this.constructor.updateDoctorRating(this.doctorId);
});

reviewSchema.post('remove', function() {
  this.constructor.updateDoctorRating(this.doctorId);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
