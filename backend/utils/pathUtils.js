import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

/**
 * ES Modules Path Utility
 * 
 * Provides __dirname, __filename, require, and rootDir for ES Module files.
 * 
 * Usage:
 *   import { getPathUtils } from './utils/pathUtils.js';
 *   const { __dirname, rootDir, require } = getPathUtils(import.meta.url);
 * 
 * @param {string} importMetaUrl - Pass import.meta.url from the calling file
 * @returns {Object} { __filename, __dirname, require, rootDir }
 */
export const getPathUtils = (importMetaUrl) => {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);
    const require = createRequire(importMetaUrl);

    // Calculate project root based on current file location
    // Assumes this utility is in backend/utils
    const rootDir = path.resolve(__dirname, '../../');

    return { __filename, __dirname, require, rootDir };
};

/**
 * Get just the root directory (most common use case)
 * @param {string} importMetaUrl - Pass import.meta.url from the calling file
 * @returns {string} Absolute path to project root
 */
export const getRootDir = (importMetaUrl) => {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '../../');
};
