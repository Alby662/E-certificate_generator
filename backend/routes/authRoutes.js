import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerValidation, loginValidation } from '../validators/validators.js';
import { handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email, password }
 */
router.post('/register', registerValidation, handleValidationErrors, register);

/**
 * POST /api/auth/login
 * Login existing user
 * Body: { email, password }
 */
router.post('/login', loginValidation, handleValidationErrors, login);

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, getMe);

export default router;
