import { parseExcel } from '../services/excelParser.js';
import fs from 'fs';

export const uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = req.file.path;

        try {
            const result = parseExcel(filePath);

            // Clean up file after parsing
            fs.unlinkSync(filePath);

            // Return detailed validation results
            res.json({
                success: true,
                data: {
                    valid: result.valid,
                    invalid: result.invalid,
                    headers: result.headers,
                    summary: result.summary,
                    // Preview of first 5 valid participants
                    preview: result.valid.slice(0, 5)
                }
            });
        } catch (parseError) {
            // Clean up file on parse error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw parseError;
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to process Excel file'
        });
    }
};

export const uploadTemplate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No template uploaded' });
        }

        // Return web-accessible URL for frontend (img tags)
        // and keep server path for backend processing
        const publicUrl = `uploads/templates/${req.file.filename}`;

        res.json({
            success: true,
            data: {
                templatePath: req.file.filename, // Filename for backend
                publicUrl: publicUrl,             // URL for frontend img tags
                filename: req.file.filename,
                originalName: req.file.originalname,
                serverPath: req.file.path         // Full path for server-side operations
            }
        });
    } catch (error) {
        console.error('Template upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
