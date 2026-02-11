import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadExcel, uploadTemplate } from '../controllers/bulkUploadController.js';
import { generateCertificates, sendEmails, getStatus, downloadZip, createProject } from '../controllers/certificateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware.js';
import { generateCertificatesValidation, sendEmailsValidation } from '../validators/validators.js';
import { handleValidationErrors } from '../middleware/validationMiddleware.js';
import { getPathUtils } from '../utils/pathUtils.js';
import { db } from '../lib/db.js';
import { validateFields, FieldValidationError } from '../validators/fieldValidator.js';

// Get ES Modules path utilities
const { __dirname, rootDir: ROOT_DIR } = getPathUtils(import.meta.url);

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
router.post('/create-project', authMiddleware, createProject);
router.post('/generate', authMiddleware, generateCertificatesValidation, handleValidationErrors, generateCertificates);
// Email routes
router.post('/send-emails', authMiddleware, sendEmailsValidation, handleValidationErrors, sendEmails);
router.get('/email-status/:projectId', authMiddleware, getStatus);
router.post('/download-zip', authMiddleware, downloadZip);
// router.get('/status', authMiddleware, getStatus); // This line was replaced by the above email-status route

// NEW: Tier 2 Preview Endpoint (Final PDF Approval)
// SUPPORTS TWO MODES:
// 1. Project Mode: Uses existing project from DB (after Excel upload)
// 2. Design Mode: Accepts direct template/fields/participant (before Excel upload)
router.post('/preview', authMiddleware, async (req, res) => {
    console.log('\n🚀 [PREVIEW] ========== REQUEST RECEIVED ==========');
    console.log('📦 [PREVIEW] Request body:', JSON.stringify(req.body, null, 2));

    try {
        const { projectId, participantIndex = 0, templatePath, fields, participant } = req.body;

        let targetParticipant, targetTemplatePath, targetFields;

        // MODE 1: Project exists in database (normal flow after Excel upload)
        if (projectId) {
            console.log('\n📂 [PREVIEW] MODE 1: Project-based preview');
            console.log('   - Project ID:', projectId);
            console.log('   - Participant Index:', participantIndex);

            const project = await db.project.findUnique({
                where: { id: parseInt(projectId), userId: req.user.id },
                include: { participants: true }
            });

            if (!project) {
                console.error('❌ [PREVIEW] Project not found');
                return res.status(404).json({ error: 'Project not found' });
            }

            console.log('   ✅ Project found:', project.name);
            console.log('   - Participants count:', project.participants.length);

            if (project.participants.length === 0) {
                console.error('❌ [PREVIEW] No participants in project');
                return res.status(400).json({ error: 'No participants found' });
            }

            targetParticipant = project.participants[participantIndex];
            targetTemplatePath = project.templatePath;
            targetFields = project.fields;

            if (!targetParticipant) {
                console.error('❌ [PREVIEW] Participant index out of bounds');
                return res.status(400).json({ error: `Participant ${participantIndex} not found` });
            }

            console.log('   ✅ Target participant:', targetParticipant.name);
        }
        // MODE 2: Design-first (test participant before project exists)
        else if (templatePath && fields && participant) {
            console.log('\n🎨 [PREVIEW] MODE 2: Design-first preview');
            console.log('   - Template:', templatePath);
            console.log('   - Fields count:', Array.isArray(fields) ? fields.length : 'N/A');
            console.log('   - Participant:', participant.name);

            targetParticipant = participant;
            targetTemplatePath = templatePath;
            targetFields = fields;

            console.log('   ✅ Design-first data validated');
        }
        else {
            console.error('❌ [PREVIEW] Invalid request: missing required parameters');
            return res.status(400).json({
                error: 'Either projectId or (templatePath + fields + participant) required'
            });
        }

        // Generate single PDF preview
        console.log('\n📥 [PREVIEW] Importing certificate generator...');
        const { generateCertificate } = await import('../services/certificateGenerator.js');
        console.log('   ✅ Generator imported');

        // 1. Extract only the filename to avoid path injection
        console.log('\n🔍 [PREVIEW] Resolving template path...');
        const filename = path.basename(targetTemplatePath);
        console.log('   - Filename:', filename);

        // 2. Build the absolute path from the ROOT
        const absoluteTemplatePath = path.join(ROOT_DIR, 'backend', 'uploads', 'templates', filename);
        console.log('   - Absolute path:', absoluteTemplatePath);
        console.log('   - File exists:', fs.existsSync(absoluteTemplatePath));

        if (!fs.existsSync(absoluteTemplatePath)) {
            console.error('❌ [PREVIEW] Template file not found!');
            return res.status(404).json({
                error: `File not found on server at: ${absoluteTemplatePath}`
            });
        }

        console.log('   ✅ Template file found!');

        // 3. Ensure fields are an object (handles JSON.stringify cases)
        console.log('\n📝 [PREVIEW] Parsing fields...');
        const parsedFields = typeof targetFields === 'string' ? JSON.parse(targetFields) : targetFields;
        console.log('   - Fields type:', typeof parsedFields);
        console.log('   - Fields count:', Array.isArray(parsedFields) ? parsedFields.length : 'N/A');
        console.log('   ✅ Fields parsed');

        // 3.5 Validate fields to prevent XSS/DOS
        console.log('\n🛡️  [PREVIEW] Validating fields...');
        try {
            validateFields(parsedFields);
            console.log('   ✅ Fields validated successfully');
        } catch (error) {
            if (error instanceof FieldValidationError) {
                console.error('❌ [PREVIEW] Field validation failed:', error.message);
                return res.status(400).json({
                    error: 'Invalid field data',
                    details: error.message,
                    field: error.field
                });
            }
            throw error;
        }

        // 4. Ensure preview directory exists
        console.log('\n📂 [PREVIEW] Checking preview directory...');
        const previewDir = path.join(ROOT_DIR, 'backend', 'uploads', 'previews');
        console.log('   - Preview dir:', previewDir);
        console.log('   - Dir exists:', fs.existsSync(previewDir));

        if (!fs.existsSync(previewDir)) {
            console.log('   ⚠️  Directory does not exist, creating...');
            fs.mkdirSync(previewDir, { recursive: true });
            console.log('   ✅ Directory created');
        } else {
            console.log('   ✅ Directory exists');
        }

        const outputPath = path.join(previewDir, `preview_${Date.now()}.pdf`);
        console.log('   - Output path:', outputPath);

        // 5. Generate & Send
        console.log('\n🎨 [PREVIEW] Calling generateCertificate...');
        console.log('   - Participant:', targetParticipant.name);
        console.log('   - Template:', absoluteTemplatePath);
        console.log('   - Output:', outputPath);
        console.log('   - Fields:', parsedFields.length, 'items');

        await generateCertificate(targetParticipant, absoluteTemplatePath, outputPath, parsedFields);

        console.log('\n✅ [PREVIEW] PDF generation completed successfully!');
        console.log('   - Output file:', outputPath);
        console.log('   - File size:', fs.statSync(outputPath).size, 'bytes');

        console.log('\n📤 [PREVIEW] Sending PDF to client...');
        res.sendFile(outputPath, (err) => {
            if (err) {
                console.error('❌ [PREVIEW] Error sending PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to send preview PDF' });
                }
            } else {
                console.log('✅ [PREVIEW] PDF sent successfully to client');
            }
            // Clean up preview file after send
            setTimeout(() => {
                try {
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                        console.log('🗑️  [PREVIEW] Cleaned up preview file:', outputPath);
                    }
                } catch (cleanupError) {
                    console.error('⚠️  [PREVIEW] Cleanup error:', cleanupError);
                }
            }, 5000);
        });


    } catch (error) {
        console.error("❌ BACKEND CRASH:", error.stack);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Approve Preview Endpoint (Sets approval flag)
router.post('/projects/:projectId/approve-preview', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;

        // Update project with approval timestamp
        const project = await db.project.update({
            where: {
                id: parseInt(projectId),
                userId: req.user.id
            },
            data: {
                previewApproved: true,
                previewApprovedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Preview approved successfully',
            project
        });

    } catch (error) {
        console.error('[Approve] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
