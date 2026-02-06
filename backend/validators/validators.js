import { body } from 'express-validator';

/**
 * Validation rules for user registration
 */
export const registerValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/\d/).withMessage('Password must contain at least one number')
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
];

/**
 * Validation rules for certificate generation
 */
export const generateCertificatesValidation = [
    body('participants')
        .isArray({ min: 1 }).withMessage('At least one participant is required')
        .custom((participants) => {
            for (const p of participants) {
                if (!p.name || typeof p.name !== 'string') {
                    throw new Error('Each participant must have a valid name');
                }
                if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
                    throw new Error('Each participant must have a valid email');
                }
            }
            return true;
        }),

    body('templatePath')
        .notEmpty().withMessage('Template path is required')
        .isString().withMessage('Template path must be a string')
        .custom((value) => {
            // Only check for path traversal (..)
            // Allow forward slashes since frontend sends "uploads/templates/filename"
            if (value.includes('..')) {
                throw new Error('Invalid template path: path traversal not allowed');
            }
            return true;
        }),

    body('fields')
        .optional()
        .isArray().withMessage('Fields must be an array')
];

/**
 * Validation rules for sending emails
 */
export const sendEmailsValidation = [
    body('participants')
        .isArray({ min: 1 }).withMessage('At least one participant is required'),

    body('subject')
        .optional()
        .trim()
        .isString().withMessage('Subject must be a string')
        .isLength({ max: 200 }).withMessage('Subject must be less than 200 characters'),

    body('message')
        .optional()
        .trim()
        .isString().withMessage('Message must be a string')
        .isLength({ max: 5000 }).withMessage('Message must be less than 5000 characters')
];
