import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadExcel, uploadTemplate } from '../controllers/bulkUploadController.js';
import { generateCertificates, sendEmails, getStatus, downloadZip, createEvent, getEvents, getEvent, deleteEvent, generatePreview, approvePreview, importMultiEventExcel, createMultiEventProject } from '../controllers/certificateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { generateCertificatesValidation, sendEmailsValidation } from '../validators/validators.js';
import { handleValidationErrors } from '../middleware/validationMiddleware.js';
import { ROOT_DIR } from '../utils/env.js';

const router = express.Router();

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
            uploadPath = path.join(ROOT_DIR, 'uploads/templates');
        } else {
            uploadPath = path.join(ROOT_DIR, 'uploads/excel');
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

// Middleware: Validate Project ID
const validateIdParam = (req, res, next) => {
    const { projectId } = req.params;
    if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({ success: false, message: 'Invalid Project ID' });
    }
    next();
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// PROTECTED ROUTES - Require authentication and validation
router.post('/bulk-upload', authMiddleware, upload.single('file'), uploadExcel);
router.post('/upload-template', authMiddleware, upload.single('template'), uploadTemplate);
router.post('/import-multi-event', authMiddleware, upload.single('excel'), importMultiEventExcel);
router.post('/create-multi-event-project', authMiddleware, createMultiEventProject);
router.post('/events', authMiddleware, createEvent);
router.post('/generate', authMiddleware, generateCertificatesValidation, handleValidationErrors, generateCertificates);
// Email routes
router.post('/send-emails', authMiddleware, sendEmailsValidation, handleValidationErrors, sendEmails);
router.get('/email-status/:eventId', authMiddleware, getStatus);
router.get('/download/:projectId', authMiddleware, validateIdParam, downloadZip);

// Event Management Routes (Phase C)
router.get('/events', authMiddleware, getEvents);
router.get('/events/:id', authMiddleware, getEvent);
router.delete('/events/:id', authMiddleware, deleteEvent);

// NEW: Tier 2 Preview Endpoint (Final PDF Approval)
// Refactored to use controller
router.post('/preview', authMiddleware, generatePreview);

// NEW: Approve Preview Endpoint (Sets approval flag)
// Refactored to use controller
router.post('/events/:eventId/approve-preview', authMiddleware, approvePreview);

export default router;
