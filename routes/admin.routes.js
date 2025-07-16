const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const AuthMiddleware = require('../middleware/auth.middleware');
const AdminHandler = require('../handlers/admin.handler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: integer
 *         totalDoctors:
 *           type: integer
 *         totalAppointments:
 *           type: integer
 *         totalRevenue:
 *           type: number
 *         recentRegistrations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         pendingVerifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Doctor'
 *     DoctorVerification:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         comments:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get admin dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */

/**
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [patient, doctor, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by user status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get user details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update user status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/admin/doctors:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all doctors with filter options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
 *         description: Filter by verification status
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, inactive, suspended]
 *         description: Filter by account status
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of doctors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 doctors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       verificationStatus:
 *                         type: string
 *                         enum: [pending, verified, rejected]
 *                       status:
 *                         type: string
 *                         enum: [pending, active, inactive, suspended]
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/doctors',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  async (req, res) => {
    try {
      const { verificationStatus, status, specialization, page = 1, limit = 10 } = req.query;
      const query = {};

      if (verificationStatus) {
        query.verificationStatus = verificationStatus;
      }

      if (status) {
        query.status = status;
      }

      if (specialization) {
        query.specializations = specialization;
      }

      const doctors = await Doctor.find(query)
        .populate('userId', 'firstName lastName email')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      const total = await Doctor.countDocuments(query);

      res.json({
        success: true,
        doctors,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      logger.error('Admin get doctors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch doctors'
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/doctors/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get a specific doctor's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor details retrieved successfully
 */
router.get('/doctors/:id', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']), 
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.id)
        .populate('userId', 'firstName lastName email');
        
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      res.json(doctor);
    } catch (error) {
      console.error('Admin get doctor error:', error);
      res.status(500).json({ message: 'Server error retrieving doctor details' });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/doctors/{id}/verify:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Verify a doctor
 *     description: Update a doctor's account status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, active, inactive, suspended]
 *                 description: Doctor's account status
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection if status is suspended
 *     responses:
 *       200:
 *         description: Doctor status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 doctor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, active, inactive, suspended]
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Server error
 */
router.post('/doctors/:id/verify',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(['admin']),
  [
    body('status').isIn(['pending', 'active', 'inactive', 'suspended']).withMessage('Invalid status'),
    body('rejectionReason').optional().isString().withMessage('Rejection reason must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, rejectionReason } = req.body;
      const doctor = await Doctor.findById(req.params.id);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }

      // Validate rejection reason is provided when suspending
      if (status === 'suspended' && !rejectionReason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required when suspending a doctor'
        });
      }

      doctor.status = status;
      if (status === 'suspended') {
        doctor.rejectionReason = rejectionReason;
      }

      await doctor.save();

      // TODO: Send notification to doctor about status change

      res.json({
        success: true,
        message: 'Doctor status updated successfully',
        doctor: {
          id: doctor._id,
          status: doctor.status
        }
      });
    } catch (error) {
      logger.error('Admin verify doctor error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update doctor status'
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get admin dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get date range for filtering
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Stats collection - using aggregation and Promise.all for parallel execution
    const [
      totalDoctors,
      pendingDoctors,
      totalAppointments,
      totalPatients,
      appointmentStats,
      revenueStats
    ] = await Promise.all([
      Doctor.countDocuments({ verified: true }),
      Doctor.countDocuments({ verificationStatus: 'pending' }),
      Appointment.countDocuments(dateFilter),
      User.countDocuments({ role: 'patient', ...dateFilter }),
      Appointment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: 'success', ...dateFilter } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Format appointment stats
    const appointmentByStatus = {};
    appointmentStats.forEach(item => {
      appointmentByStatus[item._id] = item.count;
    });
    
    const revenue = revenueStats.length > 0 ? revenueStats[0].totalAmount : 0;
    const successfulPayments = revenueStats.length > 0 ? revenueStats[0].count : 0;
    
    res.json({
      doctors: {
        total: totalDoctors,
        pending: pendingDoctors
      },
      appointments: {
        total: totalAppointments,
        byStatus: appointmentByStatus
      },
      patients: totalPatients,
      payments: {
        successful: successfulPayments,
        revenue
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard statistics' });
  }
});

/**
 * @swagger
 * /api/v1/admin/appointments:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all appointments with filter options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no-show]
 *         description: Filter by appointment status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for appointment
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for appointment
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/Appointment'
 *                 totalPages:
 *                   type: integer
 *                 totalAppointments:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/appointments', async (req, res) => {
  try {
    const { 
      status, 
      from, 
      to,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by status
    if (status && ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) {
      query.status = status;
    }
    
    // Filter by date range
    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(from);
      if (to) query.scheduledAt.$lte = new Date(to);
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get appointments with patient/doctor info
    const appointments = await Appointment.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctor.userId',
          foreignField: '_id',
          as: 'doctorUser'
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'appointmentId',
          as: 'payment'
        }
      },
      { $unwind: '$patient' },
      { $unwind: '$doctor' },
      { $unwind: '$doctorUser' },
      {
        $project: {
          _id: 1,
          scheduledAt: 1,
          status: 1,
          paymentStatus: 1,
          mode: 1,
          secondOpinion: 1,
          createdAt: 1,
          'patient._id': 1,
          'patient.firstName': 1,
          'patient.lastName': 1,
          'patient.email': 1,
          'doctor._id': 1,
          'doctor.specialties': 1,
          'doctor.consultationFee': 1,
          'doctorUser.firstName': 1,
          'doctorUser.lastName': 1,
          'doctorUser.email': 1,
          payment: { $arrayElemAt: ['$payment', 0] }
        }
      },
      { $sort: { scheduledAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    ]);
    
    // Get total count
    const totalAppointments = await Appointment.countDocuments(query);
    
    res.json({
      appointments,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalAppointments / Number(limit)),
      totalAppointments
    });
  } catch (error) {
    console.error('Admin get appointments error:', error);
    res.status(500).json({ message: 'Server error retrieving appointments' });
  }
});

/**
 * @swagger
 * /api/v1/admin/patients:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all patients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for patient name or email
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/definitions/User'
 *                 totalPages:
 *                   type: integer
 *                 totalPatients:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/patients', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // Build query
    let query = { role: 'patient' };
    
    // Add search if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get patients
    const patients = await User.find(query)
      .select('firstName lastName email phone avatarUrl createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    // Get total count
    const totalPatients = await User.countDocuments(query);
    
    res.json({
      patients,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalPatients / Number(limit)),
      totalPatients
    });
  } catch (error) {
    console.error('Admin get patients error:', error);
    res.status(500).json({ message: 'Server error retrieving patients' });
  }
});

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all users with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [patient, doctor, admin]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
router.get('/users', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']), 
  async (req, res) => {
    try {
      const { role, status, page = 1, limit = 10 } = req.query;
      const query = {};
      
      if (role) {
        query.role = role;
      }
      
      if (status) {
        query.status = status;
      }
      
      const users = await User.find(query)
        .select('-password')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });
        
      const total = await User.countDocuments(query);
      
      res.json({
        users,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
        total
      });
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ message: 'Server error retrieving users' });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get a specific user's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 */
router.get('/users/:id', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']), 
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Admin get user error:', error);
      res.status(500).json({ message: 'Server error retrieving user details' });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update a user's status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.put('/users/:id/status', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']),
  [
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { status } = req.body;
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      user.status = status;
      await user.save();
      
      res.json({ message: 'User status updated successfully', user });
    } catch (error) {
      console.error('Admin update user status error:', error);
      res.status(500).json({ message: 'Server error updating user status' });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/reviews:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all reviews with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews retrieved successfully
 */
router.get('/reviews', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']), 
  async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      const reviews = await Review.find(query)
        .populate('userId', 'firstName lastName')
        .populate('doctorId', 'userId')
        .populate('doctorId.userId', 'firstName lastName')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });
        
      const total = await Review.countDocuments(query);
      
      res.json({
        reviews,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
        total
      });
    } catch (error) {
      console.error('Admin get reviews error:', error);
      res.status(500).json({ message: 'Server error retrieving reviews' });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/reviews/{id}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update a review's status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Review status updated successfully
 */
router.put('/reviews/:id', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.authorize(['admin']),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { status } = req.body;
      const review = await Review.findById(req.params.id);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      review.status = status;
      await review.save();
      
      res.json({ message: 'Review status updated successfully', review });
    } catch (error) {
      console.error('Admin update review status error:', error);
      res.status(500).json({ message: 'Server error updating review status' });
    }
  }
);

module.exports = router;
