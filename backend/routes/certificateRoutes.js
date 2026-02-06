import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadExcel, uploadTemplate } from '../controllers/bulkUploadController.js';
import { generateCertificates, downloadZip } from '../controllers/certificateController.js';
import { sendEmails, getStatus } from '../controllers/emailController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        if (file.fieldname === 'template') {
            uploadPath = path.join(__dirname, '../uploads/templates');
        } else {
            uploadPath = path.join(__dirname, '../uploads/excel');
        }

        // Ensure directory exists
        // fs.mkdirSync(uploadPath, { recursive: true }); // We should import fs if we do this, or assume it exists.
        // Better to assume it exists or use a try-catch block if we import fs.
        // For now, let's just point to the right folders and ensure they exist via command.
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Routes
router.post('/bulk-upload', upload.single('file'), uploadExcel);
router.post('/upload-template', upload.single('template'), uploadTemplate);
router.post('/generate', generateCertificates);
router.post('/send-emails', sendEmails);
router.post('/download-zip', downloadZip);
router.get('/status', getStatus);

export default router;
