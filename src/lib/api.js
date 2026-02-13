// Centralized API configuration with timeout protection
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch wrapper with timeout protection
 * @param {string} url - Full URL or relative path
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 30s)
 * @returns {Promise<Response>}
 * @throws {Error} If request times out
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - The server is taking longer than expected. Please try again.');
        }
        throw error;
    }
};

/**
 * Helper to construct full API URLs
 * @param {string} path - API path (e.g., '/api/auth/login')
 * @returns {string} Full URL
 */
export const getApiUrl = (path) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};
/**
 * Helper to construct authenticated image URLs
 * Appends token as query parameter to allow loading via standard <img> tags
 * @param {string} path - Upload path (e.g., 'uploads/templates/...')
 * @returns {string} Authenticated URL
 */
export const getAuthenticatedImageUrl = (path) => {
    if (!path || typeof path !== 'string') return '';

    const token = localStorage.getItem('token');
    const normalized = path.replace(/\\/g, '/');
    const index = normalized.indexOf('uploads');

    const baseUrl = index !== -1
        ? `${API_BASE_URL}/${normalized.substring(index)}`
        : path;

    // Append token if available
    if (token) {
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}token=${token}`;
    }

    return baseUrl;
};
