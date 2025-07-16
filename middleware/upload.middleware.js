const multer = require('multer');
const s3Service = require('../services/aws/s3.service');
const crypto = require('crypto');
const path = require('path');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Check file type
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware to upload file to S3
const uploadToS3 = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Generate unique filename
    const fileHash = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(req.file.originalname);
    const key = `uploads/${fileHash}${extension}`;

    // Upload to S3
    await s3Service.uploadFile(
      key,
      req.file.buffer,
      req.file.mimetype
    );

    // Add S3 file info to request
    req.s3File = {
      key,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Generate pre-signed URL for client-side upload
const getUploadUrl = async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({
        error: true,
        message: 'Filename and content type are required'
      });
    }

    const fileHash = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(filename);
    const key = `uploads/${fileHash}${extension}`;

    const uploadUrl = await s3Service.getUploadUrl(key, contentType);

    res.json({
      uploadUrl,
      key,
      expiresIn: 3600
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
};

module.exports = {
  upload,
  uploadToS3,
  getUploadUrl
}; 