import { parseExcel } from '../services/excelParser.js';
import fs from 'fs';

export const uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const participants = parseExcel(filePath);

        // Clean up file after parsing
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            count: participants.length,
            participants: participants,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const uploadTemplate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No template uploaded' });
        }

        // Return the path relative to the server or absolute path
        res.json({
            success: true,
            templatePath: req.file.path,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Template upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
