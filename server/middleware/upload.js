const multer = require('multer');
const path = require('path');
const VALIDATION_LIMITS = require('../constants/validationLimits');

// Use memory storage for cloud/serverless compatibility
// Files are uploaded to Cloudinary, so disk storage is not needed
const storage = multer.memoryStorage();

// Sanitize filename to prevent path traversal attacks
const sanitizeFilename = (filename) => {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '_') // Replace path separators
    .replace(/\.\./g, '_') // Replace parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special characters
    .substring(0, 255); // Limit filename length
};

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check mimetype
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!VALIDATION_LIMITS.FILE_LIMITS.ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension. Allowed: ${VALIDATION_LIMITS.FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
  
  // Sanitize filename
  file.originalname = sanitizeFilename(file.originalname);
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    files: VALIDATION_LIMITS.FILE_LIMITS.MAX_FILES, 
    fileSize: VALIDATION_LIMITS.FILE_LIMITS.MAX_FILE_SIZE
  }
});

module.exports = upload; 