const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  phone: {
    countryCode: {
      type: String,
      required: true
    },
    number: {
      type: String,
      required: true
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true }
  },
  languages: {
    type: [String],
    required: true,
    validate: [arr => Array.isArray(arr) && arr.length > 0, 'At least one language is required']
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    default: 'patient'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Doctor-specific fields
  professionalRegistry: { type: String, default: '' }, // Professional registry or association
  chamberOfCommerceNumber: { type: String, default: '' }, // Chamber of Commerce number
  iban: { type: String, default: '' }, // IBAN for payments
  vatNumber: { type: String, default: '' }, // VAT number
  hasLiabilityInsurance: { type: Boolean, default: false }, // Has valid professional liability insurance
  liabilityInsurancePolicyNumber: { type: String, default: '' }, // Policy number
  liabilityInsuranceInsurer: { type: String, default: '' }, // Insurer
  liabilityInsuranceDocument: { type: String, default: '' }, // S3 URL for uploaded insurance document
  hasCertificateOfConduct: { type: Boolean, default: false }, // Has certificate of conduct (VOG)
  certificateOfConductDocument: { type: String, default: '' }, // S3 URL for uploaded certificate of conduct
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes - consolidated all indexes here
userSchema.index({ 'phone.number': 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastLogin: 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
