const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  specializations: [{
    type: String,
    required: true
  }],
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  about: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: false
  },
  languages: [{
    type: String
  }],
  education: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  training: [{
    name: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  awards: [{
    name: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  publications: [{
    title: {
      type: String,
      required: true
    },
    journal: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      format: 'uri'
    }
  }],
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  clinicLocation: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'Netherlands'
    }
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    slots: [{
      startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      }
    }]
  }],
  unavailability: [{
    date: { type: Date, required: true },
    slots: [{
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    }],
    reason: { type: String }
  }],
  status: {
    type: String,
    enum: ['DETAILS_REQUIRED', 'DETAILS_UPDATED', 'VERIFIED', 'REJECTED'],
    default: 'DETAILS_REQUIRED'
  },
  adminComments: {
    type: String,
    default: ''
  },
  documents: {
    licenseFile: String,
    idProof: String
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  slotDurationMinutes: {
    type: Number,
    default: 15,
    min: 5,
    max: 120,
    description: 'Duration in minutes for each patient slot.'
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
  certificateOfConductDocument: { type: String, default: '' } // S3 URL for uploaded certificate of conduct
}, {
  timestamps: true
});

doctorSchema.index({ userId: 1 });
doctorSchema.index({ registrationNumber: 1 }, { unique: true });
doctorSchema.index({ specializations: 1 });
doctorSchema.index({ 'clinicLocation.city': 1 });
doctorSchema.index({ status: 1 });

// Index for text search
doctorSchema.index({
  specializations: 'text',
  about: 'text',
  'education.degree': 'text',
  'education.institution': 'text',
  'training.name': 'text',
  'training.institution': 'text',
  'awards.name': 'text',
  'publications.title': 'text',
  'publications.journal': 'text',
  'services.name': 'text',
  'services.description': 'text'
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
