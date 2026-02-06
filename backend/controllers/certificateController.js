import { generateCertificate } from '../services/certificateGenerator.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateCertificates = async (req, res) => {
    try {
        const { participants, templateImage } = req.body; // templateImage should be base64 or path if uploaded previously
        // Actually, for file upload, we might handle template image via multer too.
        // Let's assume the frontend sends the template image file in a previous step or this step.
        // Or we can assume the user uploaded a template earlier and we have the path.

        // For simplicity, let's assume the template is uploaded via a separate endpoint or passed here.
        // If passed here as base64, it might be large.
        // Better: Upload template first, get ID/Path, then use it.

        // However, the prompt says "Use uploaded certificate template image".
        // Let's assume the frontend sends the template file in the request or we use a stored one.
        // Given the flow, maybe we upload the template in step 1, get a path.

        // Let's check the request. If it's JSON, we expect a path or base64.
        // If we use multer for this endpoint too, we can handle the file.

        // But this endpoint is "Generate Certificates", implying bulk.
        // We probably want to use the template uploaded in Step 1.
        // Let's assume the frontend sends the `templatePath` (relative to server) or we handle it.

        // Let's assume the request body has: { participants: [], templatePath: '...' }
        // We need to make sure the template exists.

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ success: false, message: 'Invalid participants data' });
        }

        const { templatePath, fields } = req.body;
        if (!templatePath) {
            return res.status(400).json({ success: false, message: 'Template path is required' });
        }

        // Resolve absolute path
        const absoluteTemplatePath = path.resolve(templatePath);
        if (!fs.existsSync(absoluteTemplatePath)) {
            return res.status(400).json({ success: false, message: 'Template file not found' });
        }

        const outputDir = path.join(__dirname, '../uploads/certificates');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generatedFiles = [];

        // We can generate in parallel or sequence. Parallel is faster but heavier.
        // Let's do chunks.
        const chunk = async (arr) => {
            for (let i = 0; i < arr.length; i++) {
                const p = arr[i];
                // Sanitize name for filename
                const safeName = p.name ? p.name.replace(/[^a-z0-9]/gi, '_').trim() : 'Participant';
                const fileName = `${i + 1}_${safeName}.pdf`;
                const outputPath = path.join(outputDir, fileName);
                await generateCertificate(p, absoluteTemplatePath, outputPath, fields);
                generatedFiles.push({ certificate_id: p.certificate_id, path: outputPath, fileName });
            }
        }

        await chunk(participants);

        res.json({
            success: true,
            generatedCount: generatedFiles.length,
            certificates: generatedFiles
        });

    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const downloadZip = async (req, res) => {
    try {
        console.log("Received ZIP download request");
        const { filePaths } = req.body; // Expect array of absolute paths
        console.log("File paths received:", filePaths);

        if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
            console.error("No file paths provided");
            return res.status(400).json({ success: false, message: 'No files to zip' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        res.attachment('certificates.zip');

        archive.pipe(res);

        filePaths.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: path.basename(filePath) });
            } else {
                console.warn(`File not found for zip: ${filePath}`);
            }
        });

        await archive.finalize();
        console.log("ZIP archive finalized and sent");

    } catch (error) {
        console.error('Zip error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
