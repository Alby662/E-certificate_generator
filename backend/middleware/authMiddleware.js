import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';

/**
 * Middleware to verify JWT token and protect routes
 * Usage: router.get('/protected', authMiddleware, controller)
 */
export const authMiddleware = async (req, res, next) => {
    try {
        // Get token from Authorization header or Query Parameter (for static assets/images)
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please authenticate.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request object
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please authenticate.'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
};

/**
 * Optional middleware - doesn't fail if no token is provided
 * Just attaches user info if valid token exists
 */
export const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);

            req.user = {
                userId: decoded.userId,
                email: decoded.email
            };
        }

        next();
    } catch (error) {
        // Silently fail - this is optional auth
        next();
    }
};
