export class FieldValidationError extends Error {
    constructor(field, message) {
        super(`Invalid field '${field}': ${message}`);
        this.name = 'FieldValidationError';
        this.field = field;
    }
}

/**
 * Validates a single field object
 * @param {object} field - Field to validate
 * @param {number|string} index - Field index for error reporting
 * @throws {FieldValidationError} If validation fails
 */
export const validateField = (field, index) => {
    if (!field || typeof field !== 'object') {
        throw new FieldValidationError(index, 'Field must be an object');
    }

    // Validate coordinates (must be 0-1 range for percentage-based positioning)
    if (typeof field.x !== 'number' || field.x < 0 || field.x > 1) {
        throw new FieldValidationError(index, `x coordinate must be between 0 and 1, got ${field.x}`);
    }

    if (typeof field.y !== 'number' || field.y < 0 || field.y > 1) {
        throw new FieldValidationError(index, `y coordinate must be between 0 and 1, got ${field.y}`);
    }

    // Validate font size (reasonable limits)
    if (typeof field.fontSize !== 'number' || field.fontSize < 0.001 || field.fontSize > 0.2) {
        throw new FieldValidationError(index, `fontSize must be between 0.001 and 0.2, got ${field.fontSize}`);
    }

    // Validate required string fields
    const stringFields = ['id', 'key', 'label', 'color', 'align', 'fontFamily'];
    stringFields.forEach(prop => {
        if (field[prop] !== undefined && field[prop] !== null && typeof field[prop] !== 'string') {
            throw new FieldValidationError(index, `${prop} must be a string, got ${typeof field[prop]}`);
        }
    });

    // Sanitize color (prevent XSS) - must be valid hex format
    if (field.color) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(field.color)) {
            throw new FieldValidationError(index, `color must be valid hex format (#RRGGBB), got ${field.color}`);
        }
    }

    // Validate alignment
    const validAligns = ['left', 'center', 'right'];
    if (field.align && !validAligns.includes(field.align)) {
        throw new FieldValidationError(index, `align must be one of ${validAligns.join(', ')}, got ${field.align}`);
    }

    // Validate key (must be a valid identifier, no SQL injection attempts)
    if (field.key) {
        if (field.key.length > 100) {
            throw new FieldValidationError(index, `key must be at most 100 characters, got ${field.key.length}`);
        }
        // Prevent potential SQL injection via key names
        if (!/^[a-zA-Z0-9_-]+$/.test(field.key)) {
            throw new FieldValidationError(index, `key must contain only alphanumeric characters, hyphens, and underscores`);
        }
    }

    // Validate label length
    if (field.label && field.label.length > 500) {
        throw new FieldValidationError(index, `label must be at most 500 characters, got ${field.label.length}`);
    }

    return true;
};

/**
 * Validates an array of fields
 * @param {Array} fields - Array of field objects to validate
 * @throws {FieldValidationError} If validation fails
 * @returns {boolean} True if all fields are valid
 */
export const validateFields = (fields) => {
    if (!Array.isArray(fields)) {
        throw new FieldValidationError('fields', 'Fields must be an array');
    }

    if (fields.length === 0) {
        throw new FieldValidationError('fields', 'At least one field is required');
    }

    if (fields.length > 50) {
        throw new FieldValidationError('fields', `Maximum 50 fields allowed, got ${fields.length}`);
    }

    fields.forEach((field, index) => validateField(field, index));
    return true;
};
