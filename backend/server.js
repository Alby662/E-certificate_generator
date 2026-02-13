import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { ROOT_DIR } from './utils/env.js';
import authRoutes from './routes/authRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import participantRoutes from './routes/participantRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ROOT_DIR is already the backend root
const __dirname = ROOT_DIR;

// SECURITY: Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// SECURITY: CORS - restrict to frontend origin only
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Apply rate limiting to all API routes
app.use('/api', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (optional, for accessing generated files directly if needed)
// SECURED: Require authentication and rate limiting to access uploads
import { authMiddleware } from './middleware/authMiddleware.js';
app.use('/uploads', limiter, authMiddleware, express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/participants', participantRoutes);

// Base route
app.get('/', (req, res) => {
    res.send('Certificate Generator API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
