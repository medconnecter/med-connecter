const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');
const Review = require('../models/review.model');
const BigRegisterService = require('../services/bigRegister.service');
const { isValidRegistrationNumber } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const axios = require('axios');
const xml2js = require('xml2js');

const BIG_REGISTER_URL = 'https://webservice.bigregister.cibg.nl/';

class DoctorHandler {
  // Verify registration number
  static async verifyRegistrationNumber (req, res) {
    try {
      const { registrationNumber } = req.body;
      const userId = req.user._id.toString(); // Convert to hex string

      logger.info('Verifying registration number', {
        userId,
        registrationNumber
      });

      if (!registrationNumber) {
        return res.status(400).json({
          success: false,
          error: 'Registration number is required'
        });
      }

      // Verify with BIG register
      const verificationResult = await BigRegisterService.verifyRegistrationNumber(registrationNumber);

      // Find or create doctor profile using hexId
      let doctor = await Doctor.findOne({ userId });

      logger.info('Doctor profile lookup result', {
        userId,
        doctorFound: !!doctor,
        doctorId: doctor?._id
      });

      if (!doctor) {
        // Create new doctor with only registration number
        doctor = new Doctor({
          userId,
          registrationNumber,
          status: 'DETAILS_REQUIRED',
          // Initialize with empty arrays and objects
          specializations: [],
          education: [],
          training: [],
          awards: [],
          publications: [],
          services: [],
          availability: [],
          // Initialize clinicLocation without coordinates
          clinicLocation: {
            address: '',
            city: '',
            postalCode: '',
            country: 'Netherlands'
            // No coordinates field at all
          }
        });
      } else {
        // Update only registration number related fields
        doctor.registrationNumber = registrationNumber;
        if (verificationResult.success) {
          doctor.status = 'DETAILS_REQUIRED';
        }
      }

      // Save with validation disabled for registration number update
      await doctor.save({ validateBeforeSave: false });

      logger.info('Doctor profile saved', {
        doctorId: doctor._id,
        isVerified: verificationResult.success
      });

      return res.json({
        success: true,
        message: verificationResult.success
          ? 'Registration number verified successfully'
          : 'Registration number verification failed',
        isVerified: verificationResult.success,
        doctor: {
          id: doctor._id,
          registrationNumber: doctor.registrationNumber,
          status: doctor.status
        }
      });
    } catch (error) {
      logger.error('Registration number verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify registration number'
      });
    }
  }

  // Create or update doctor profile
  static async createOrUpdateProfile (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string

      // Check if user is a doctor
      const user = await User.findById(userId);
      if (!user || user.role !== 'doctor') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors can create/update doctor profiles'
        });
      }

      // Destructure all doctor-specific fields once
      const {
        registrationNumber,
        specializations,
        experience,
        consultationFee,
        currency,
        about,
        education,
        training,
        awards,
        publications,
        services,
        clinicLocation,
        availability,
        unavailability,
        documents,
        rating,
        totalReviews,
        slotDurationMinutes,
        professionalRegistry,
        chamberOfCommerceNumber,
        iban,
        vatNumber,
        hasLiabilityInsurance,
        liabilityInsurancePolicyNumber,
        liabilityInsuranceInsurer,
        liabilityInsuranceDocument,
        hasCertificateOfConduct,
        certificateOfConductDocument
      } = req.body;

      // Find existing doctor profile
      let doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        // Create new doctor profile with provided details
        doctor = new Doctor({
          userId,
          registrationNumber,
          specializations,
          experience,
          consultationFee,
          currency,
          about,
          education,
          training,
          awards,
          publications,
          services,
          clinicLocation,
          availability,
          unavailability,
          documents,
          rating,
          totalReviews,
          slotDurationMinutes,
          professionalRegistry,
          chamberOfCommerceNumber,
          iban,
          vatNumber,
          hasLiabilityInsurance,
          liabilityInsurancePolicyNumber,
          liabilityInsuranceInsurer,
          liabilityInsuranceDocument,
          hasCertificateOfConduct,
          certificateOfConductDocument,
          status: 'DETAILS_UPDATED'
        });
        await doctor.save();
        return res.json({
          success: true,
          message: 'Doctor profile created successfully. Waiting for admin approval.',
          doctor
        });
      }

      // Validate required fields
      if (!specializations || !Array.isArray(specializations) || specializations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one specialization is required'
        });
      }

      if (typeof experience !== 'number' || experience < 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid experience in years is required'
        });
      }

      if (typeof consultationFee !== 'number' || consultationFee < 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid consultation fee is required'
        });
      }

      if (!about || typeof about !== 'string' || about.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'About section is required'
        });
      }

      if (!education || !Array.isArray(education) || education.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one education entry is required'
        });
      }

      // Validate education entries
      for (const edu of education) {
        if (!edu.degree || !edu.institution || !edu.year) {
          return res.status(400).json({
            success: false,
            error: 'Each education entry must have degree, institution, and year'
          });
        }
      }

      // Validate clinic location
      if (!clinicLocation || !clinicLocation.address || !clinicLocation.city || !clinicLocation.postalCode) {
        return res.status(400).json({
          success: false,
          error: 'Complete clinic location details are required'
        });
      }

      // Validate coordinates if provided
      if (clinicLocation.coordinates) {
        if (!clinicLocation.coordinates.coordinates || !Array.isArray(clinicLocation.coordinates.coordinates) || clinicLocation.coordinates.coordinates.length !== 2) {
          return res.status(400).json({
            success: false,
            error: 'Valid coordinates are required (longitude and latitude)'
          });
        }
      }

      // Update doctor profile with all fields
      doctor.registrationNumber = registrationNumber;
      doctor.specializations = specializations;
      doctor.experience = experience;
      doctor.consultationFee = consultationFee;
      doctor.currency = currency;
      doctor.about = about;
      doctor.education = education;
      doctor.training = training;
      doctor.awards = awards;
      doctor.publications = publications;
      doctor.services = services;
      doctor.clinicLocation = clinicLocation;
      doctor.availability = availability;
      doctor.unavailability = unavailability;
      doctor.documents = documents;
      doctor.rating = rating;
      doctor.totalReviews = totalReviews;
      doctor.slotDurationMinutes = slotDurationMinutes;
      doctor.professionalRegistry = professionalRegistry;
      doctor.chamberOfCommerceNumber = chamberOfCommerceNumber;
      doctor.iban = iban;
      doctor.vatNumber = vatNumber;
      doctor.hasLiabilityInsurance = hasLiabilityInsurance;
      doctor.liabilityInsurancePolicyNumber = liabilityInsurancePolicyNumber;
      doctor.liabilityInsuranceInsurer = liabilityInsuranceInsurer;
      doctor.liabilityInsuranceDocument = liabilityInsuranceDocument;
      doctor.hasCertificateOfConduct = hasCertificateOfConduct;
      doctor.certificateOfConductDocument = certificateOfConductDocument;
      doctor.status = 'DETAILS_UPDATED';
      await doctor.save();
      return res.json({
        success: true,
        message: 'Doctor profile updated successfully. Waiting for admin approval.',
        doctor
      });
    } catch (error) {
      logger.error('Doctor profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update doctor profile'
      });
    }
  }

  // Get doctor profile
  static async getDoctorProfile (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string

      const doctor = await Doctor.findOne({ userId }).populate('userId');
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor profile not found'
        });
      }

      res.json({
        success: true,
        doctor
      });
    } catch (error) {
      logger.error('Get doctor profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get doctor profile'
      });
    }
  }

  // Update doctor profile
  static async updateProfile (req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user._id.toString(); // Convert to hex string
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        doctor._id,
        { $set: req.body },
        { new: true }
      ).populate('userId');

      res.json(updatedDoctor);
    } catch (error) {
      logger.error('Error updating doctor profile:', error);
      res.status(500).json({ message: 'Error updating doctor profile' });
    }
  }

  // Update registration number
  static async verifyRegistration (req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { registrationNumber } = req.body;

      if (!isValidRegistrationNumber(registrationNumber)) {
        return res.status(400).json({ message: 'Invalid registration number format' });
      }

      // TODO: Implement actual BIG-register API verification
      // For now, we'll just check the format
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      doctor.registrationNumber = registrationNumber;
      doctor.status = 'DETAILS_REQUIRED';
      await doctor.save();

      res.json({ message: 'Registration number submitted for verification' });
    } catch (error) {
      console.error('Error verifying registration:', error);
      res.status(500).json({ message: 'Error verifying registration' });
    }
  }

  // Get doctor reviews
  static async getReviews (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      const reviews = await Review.find({ doctorId: doctor._id })
        .populate('patientId', 'firstName lastName')
        .sort({ createdAt: -1 });

      res.json(reviews);
    } catch (error) {
      logger.error('Error getting reviews:', error);
      res.status(500).json({ message: 'Error getting reviews' });
    }
  }

  // Get doctor statistics
  static async getStatistics (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor profile not found'
        });
      }

      const totalReviews = await Review.countDocuments({ doctorId: doctor._id });
      const verifiedReviews = await Review.countDocuments({
        doctorId: doctor._id,
        isVerified: true
      });
      const averageRating = await Review.aggregate([
        { $match: { doctorId: doctor._id, isVerified: true } },
        { $group: { _id: null, average: { $avg: '$rating' } } }
      ]);

      res.json({
        success: true,
        data: {
          totalReviews,
          verifiedReviews,
          averageRating: averageRating[0]?.average || 0
        }
      });
    } catch (error) {
      logger.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }

  // Get all specializations
  static async getSpecializations (req, res) {
    try {
      const specializations = await BigRegisterService.getSpecializations();
      res.json({
        success: true,
        data: specializations
      });
    } catch (error) {
      console.error('Error in getSpecializations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch specializations'
      });
    }
  }

  static async getAppointments (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      const appointments = await Appointment.find({ doctorId: doctor._id })
        .populate('patientId', 'firstName lastName email phone')
        .sort({ date: -1 });

      res.json(appointments);
    } catch (error) {
      logger.error('Error getting appointments:', error);
      res.status(500).json({ message: 'Error getting appointments' });
    }
  }

  static async updateAppointmentStatus (req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user._id.toString(); // Convert to hex string

      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found' });
      }

      const appointment = await Appointment.findOne({
        _id: id,
        doctorId: doctor._id
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      appointment.status = status;
      await appointment.save();

      res.json(appointment);
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      res.status(500).json({ message: 'Error updating appointment status' });
    }
  }

  // Get all doctors
  static async getDoctors (req, res) {
    try {
      const { specialization, verified, page = 1, limit = 10, gender, language, minPrice, maxPrice, rating } = req.query;
      const query = {};

      if (specialization) {
        query.specializations = specialization;
      }

      if (verified === 'true') {
        query.status = 'VERIFIED';
      } else if (verified === 'false') {
        query.status = { $ne: 'VERIFIED' };
      }

      if (gender) {
        query.gender = gender;
      }

      if (language) {
        // Support comma-separated values
        const langs = language.split(',').map(l => l.trim());
        query.languages = { $in: langs };
      }

      if (minPrice || maxPrice) {
        query.consultationFee = {};
        if (minPrice) query.consultationFee.$gte = Number(minPrice);
        if (maxPrice) query.consultationFee.$lte = Number(maxPrice);
      }

      if (rating) {
        query.rating = { $gte: Number(rating) };
      }

      const doctors = await Doctor.find(query)
        .populate('userId')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      const total = await Doctor.countDocuments(query);

      res.json({
        doctors,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      logger.error('Get doctors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctors'
      });
    }
  }

  // Get doctor by ID (query param)
  static async getDoctorById (req, res) {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Doctor id is required as a query parameter.'
        });
      }
      const doctor = await Doctor.findById(id).populate('userId');
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }
      res.json({ success: true, doctor });
    } catch (error) {
      logger.error('Get doctor by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctor'
      });
    }
  }

  // Get all specialties
  static async getSpecialties (req, res) {
    try {
      // Get unique specializations from the doctor collection
      const specializations = await Doctor.distinct('specializations', { specializations: { $ne: [] } });
      res.json({
        success: true,
        data: specializations
      });
    } catch (error) {
      logger.error('Get specialties error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch specialties'
      });
    }
  }

  // Get doctor availability
  static async getAvailability (req, res) {
    try {
      const { doctorId, startDate, endDate, gender, language, minPrice, maxPrice, rating } = req.query;

      // Validate date parameters
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end) || start > end) {
        return res.status(400).json({ success: false, error: 'Invalid date range' });
      }

      let doctors = [];

      if (doctorId) {
        // Get availability for specific doctor
        const doctor = await Doctor.findById(doctorId).populate('userId');
        if (!doctor) {
          return res.status(404).json({ success: false, error: 'Doctor not found' });
        }
        doctors = [doctor];
      } else {
        // Get availability for all doctors
        const query = { status: 'VERIFIED' };
        if (gender) {
          query.gender = gender;
        }
        if (language) {
          const langs = language.split(',').map(l => l.trim());
          query.languages = { $in: langs };
        }
        if (minPrice || maxPrice) {
          query.consultationFee = {};
          if (minPrice) query.consultationFee.$gte = Number(minPrice);
          if (maxPrice) query.consultationFee.$lte = Number(maxPrice);
        }
        if (rating) {
          query.rating = { $gte: Number(rating) };
        }
        doctors = await Doctor.find(query).populate('userId');
      }

      const allAvailability = [];

      for (const doctor of doctors) {
        const doctorAvailability = [];

        for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
          const dateStr = d.toISOString().slice(0, 10);
          const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const recurring = doctor.availability.find(a => a.day === weekday);
          let slots = recurring ? [...recurring.slots] : [];

          const unavail = doctor.unavailability.find(u => u.date.toISOString().slice(0, 10) === dateStr);
          if (unavail) {
            slots = slots.filter(slot => !unavail.slots.some(uSlot => slot.startTime < uSlot.endTime && slot.endTime > uSlot.startTime));
          }

          const availabilityEntry = {
            date: dateStr,
            slots
          };

          // Add doctor info only when returning multiple doctors
          if (!doctorId) {
            availabilityEntry.doctorId = doctor._id;
            availabilityEntry.doctorName = doctor.userId && doctor.userId.firstName && doctor.userId.lastName ? `${doctor.userId.firstName} ${doctor.userId.lastName}` : '';
          }

          doctorAvailability.push(availabilityEntry);
        }

        allAvailability.push(...doctorAvailability);
      }

      res.json({ success: true, availability: allAvailability });
    } catch (error) {
      logger.error('Get availability error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch availability' });
    }
  }

  // Update doctor availability
  static async updateAvailability (req, res) {
    try {
      const userId = req.user._id.toString();
      const doctor = await Doctor.findOne({ userId });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor profile not found'
        });
      }

      doctor.availability = req.body.availability;
      await doctor.save();

      res.json({
        success: true,
        message: 'Availability updated successfully',
        availability: doctor.availability
      });
    } catch (error) {
      logger.error('Update availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update availability'
      });
    }
  }

  // Register doctor
  static async registerDoctor (req, res) {
    try {
      const userId = req.user._id.toString(); // Convert to hex string

      // Check if user is a doctor
      const user = await User.findById(userId);
      if (!user || user.role !== 'doctor') {
        return res.status(403).json({
          success: false,
          error: 'Only doctors can register'
        });
      }

      // Check if doctor profile already exists
      const existingDoctor = await Doctor.findOne({ userId });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          error: 'Doctor profile already exists'
        });
      }

      // Create new doctor profile
      const doctor = new Doctor({
        userId,
        registrationNumber: '',
        status: 'DETAILS_REQUIRED',
        specializations: [],
        education: [],
        training: [],
        awards: [],
        publications: [],
        services: [],
        availability: [],
        clinicLocation: {
          address: '',
          city: '',
          postalCode: '',
          country: 'Netherlands'
        }
      });

      await doctor.save();

      res.status(201).json({
        success: true,
        message: 'Doctor profile created successfully. Please verify your registration number.',
        doctor: {
          id: doctor._id,
          registrationNumber: doctor.registrationNumber,
          status: doctor.status
        }
      });
    } catch (error) {
      logger.error('Doctor registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register doctor'
      });
    }
  }

  // Add or update unavailability for a doctor (add or update slots for a date)
  static async addUnavailability (req, res) {
    try {
      const userId = req.user._id.toString();
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ success: false, error: 'Doctor profile not found' });
      }
      const { date, slots, reason } = req.body;
      if (!date || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ success: false, error: 'date and slots are required' });
      }
      // Remove any existing unavailability for this date
      doctor.unavailability = doctor.unavailability.filter(u => u.date.toISOString().slice(0, 10) !== new Date(date).toISOString().slice(0, 10));
      // Add new unavailability
      doctor.unavailability.push({ date: new Date(date), slots, reason });
      await doctor.save();
      res.json({ success: true, unavailability: doctor.unavailability });
    } catch (error) {
      logger.error('Add unavailability error:', error);
      res.status(500).json({ success: false, error: 'Failed to add unavailability' });
    }
  }

  // Remove unavailability for a specific date
  static async removeUnavailability (req, res) {
    try {
      const userId = req.user._id.toString();
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.status(404).json({ success: false, error: 'Doctor profile not found' });
      }
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ success: false, error: 'date is required' });
      }
      doctor.unavailability = doctor.unavailability.filter(u => u.date.toISOString().slice(0, 10) !== new Date(date).toISOString().slice(0, 10));
      await doctor.save();
      res.json({ success: true, unavailability: doctor.unavailability });
    } catch (error) {
      logger.error('Remove unavailability error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove unavailability' });
    }
  }

  // Get unavailability for a doctor
  static async getUnavailability (req, res) {
    try {
      const { doctorId } = req.query;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, error: 'Doctor not found' });
      }
      res.json({ success: true, unavailability: doctor.unavailability });
    } catch (error) {
      logger.error('Get unavailability error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch unavailability' });
    }
  }

  static async getDoctorFromBigRegister (req, res) {
    try {
      const { registerNumber } = req.query;
      if (!registerNumber) {
        return res.status(400).json({ message: 'registerNumber is required' });
      }
      // Build SOAP envelope
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:web="https://webservice.bigregister.cibg.nl/">
           <soapenv:Header/>
           <soapenv:Body>
              <web:ListHcpApprox4>
                 <web:request>
                    <web:WebSite>Ribiz</web:WebSite>
                    <web:RegistrationNumber>${registerNumber}</web:RegistrationNumber>
                 </web:request>
              </web:ListHcpApprox4>
           </soapenv:Body>
        </soapenv:Envelope>`;
      // Make SOAP request
      const response = await axios.post(BIG_REGISTER_URL, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: ''
        },
        timeout: 10000
      });
      // Parse XML response
      xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to parse BIG register response' });
        }
        try {
          const body = result['soapenv:Envelope']['soapenv:Body'];
          const listResponse = body['ns2:ListHcpApprox4Response'] || body.ListHcpApprox4Response;
          const returnData = listResponse?.return;
          if (!returnData || !returnData.hcpApproxList || !returnData.hcpApproxList.hcpApprox) {
            return res.status(404).json({ message: 'Doctor not found in BIG register' });
          }
          res.json(returnData.hcpApproxList.hcpApprox);
        } catch (parseErr) {
          return res.status(404).json({ message: 'Doctor not found in BIG register' });
        }
      });
    } catch (error) {
      console.error('BIG register SOAP error:', error);
      res.status(500).json({ message: 'Error fetching from BIG register' });
    }
  }

  // Get doctor status by userId
  static async getDoctorStatus (req, res) {
    try {
      const { userId } = req.params;
      const user = await require('../models/user.model').findById(userId);
      if (!user || user.role !== 'doctor') {
        return res.status(404).json({ success: false, error: 'User is not a doctor or does not exist' });
      }
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) {
        return res.json({ success: true, status: 'DETAILS_REQUIRED' });
      }
      return res.json({ success: true, status: doctor.status });
    } catch (error) {
      logger.error('Error getting doctor status:', error);
      res.status(500).json({ success: false, error: 'Failed to get doctor status' });
    }
  }
}

module.exports = DoctorHandler;
