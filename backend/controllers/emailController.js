import { sendBulkEmails } from '../services/mailService.js';

// In-memory status store (for simplicity, ideally use DB or Redis)
let emailStatus = {
    sent: 0,
    failed: 0,
    total: 0,
    errors: []
};

export const sendEmails = async (req, res) => {
    try {
        const { participants, certificates } = req.body;
        // certificates: { id: path, ... } map

        if (!participants || !certificates) {
            return res.status(400).json({ success: false, message: 'Missing data' });
        }

        emailStatus = { sent: 0, failed: 0, total: participants.length, errors: [] };

        // Start process in background
        sendBulkEmails(participants, certificates, (status) => {
            emailStatus.sent = status.sent;
            emailStatus.failed = status.failed;
            emailStatus.errors = status.errors;
        }).catch(err => console.error("Background email error:", err));

        res.json({ success: true, message: 'Email sending started' });
    } catch (error) {
        console.error('Email controller error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getStatus = (req, res) => {
    res.json(emailStatus);
};
