import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadExcel, uploadTemplate } from '../controllers/bulkUploadController.js';
import { generateCertificates, downloadZip } from '../controllers/certificateController.js';
import { sendEmails, getStatus } from '../controllers/emailController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { generateCertificatesValidation, sendEmailsValidation } from '../validators/validators.js';
import { handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SECURITY: Define allowed file types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXCEL_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Configure Multer for file uploads with security controls
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        if (file.fieldname === 'template') {
            uploadPath = path.join(__dirname, '../uploads/templates');
        } else {
            uploadPath = path.join(__dirname, '../uploads/excel');
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random suffix
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    },
});

// File filter for MIME type validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = file.fieldname === 'template'
        ? ALLOWED_IMAGE_TYPES
        : ALLOWED_EXCEL_TYPES;

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// PROTECTED ROUTES - Require authentication and validation
router.post('/bulk-upload', authMiddleware, upload.single('file'), uploadExcel);
router.post('/upload-template', authMiddleware, upload.single('template'), uploadTemplate);
router.post('/generate', authMiddleware, generateCertificatesValidation, handleValidationErrors, generateCertificates);
router.post('/send-emails', authMiddleware, sendEmailsValidation, handleValidationErrors, sendEmails);
router.post('/download-zip', authMiddleware, downloadZip);
router.get('/status', authMiddleware, getStatus);

export default router;
