import xlsx from 'xlsx';

/**
 * Validates a single participant row
 * @returns {object} { valid: boolean, errors: string[] }
 */
const validateParticipantRow = (row, rowIndex, allEmails) => {
    const errors = [];

    // Check for empty row
    if (!row || Object.keys(row).length === 0) {
        return { valid: false, errors: ['Empty row'], isEmpty: true };
    }

    // Required field: name
    if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
        errors.push('Name is required');
    } else if (row.name.trim().length > 100) {
        errors.push('Name must be less than 100 characters');
    }

    // Required field: email
    if (!row.email || typeof row.email !== 'string' || row.email.trim() === '') {
        errors.push('Email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = row.email.trim().toLowerCase();

        if (!emailRegex.test(trimmedEmail)) {
            errors.push('Invalid email format');
        }

        // Check for duplicates
        const duplicateIndex = allEmails.indexOf(trimmedEmail);
        if (duplicateIndex !== -1 && duplicateIndex !== rowIndex) {
            errors.push(`Duplicate email (also found in row ${duplicateIndex + 2})`);
        }
    }

    // Validate certificate_id if present
    if (row.certificate_id && typeof row.certificate_id === 'string' && row.certificate_id.trim().length > 50) {
        errors.push('Certificate ID must be less than 50 characters');
    }

    return { valid: errors.length === 0, errors, isEmpty: false };
};

/**
 * Parse Excel file and validate data
 * @param {string} filePath - Path to Excel file
 * @returns {object} { valid: array, invalid: array, headers: array, summary: object }
 */
export const parseExcel = (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get headers
        const data = xlsx.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            throw new Error('Excel file is empty or has no data rows');
        }

        // Extract headers from first row
        const headers = Object.keys(data[0]);

        // Check for required columns (case-insensitive)
        const lowerHeaders = headers.map(h => h.toLowerCase());
        const requiredColumns = ['name', 'email'];
        const missingColumns = requiredColumns.filter(col =>
            !lowerHeaders.includes(col.toLowerCase())
        );

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`);
        }

        // Collect all emails for duplicate detection
        const allEmails = data.map(row => row.email ? row.email.trim().toLowerCase() : '');

        // Validate each row
        const validParticipants = [];
        const invalidParticipants = [];
        let emptyRowCount = 0;

        data.forEach((row, index) => {
            const validation = validateParticipantRow(row, index, allEmails);

            if (validation.isEmpty) {
                emptyRowCount++;
                return;
            }

            const participantData = {
                rowNumber: index + 2, // Excel row number (1-indexed + header row)
                name: row.name?.trim() || '',
                email: row.email?.trim().toLowerCase() || '',
                // DON'T generate certificateId - backend will create unique IDs
                customData: {}
            };

            // Store any additional columns as custom data
            headers.forEach(header => {
                if (!['name', 'email', 'certificate_id'].includes(header.toLowerCase())) {
                    participantData.customData[header] = row[header];
                }
            });

            if (validation.valid) {
                validParticipants.push(participantData);
            } else {
                invalidParticipants.push({
                    ...participantData,
                    errors: validation.errors
                });
            }
        });

        // Create summary
        const summary = {
            totalRows: data.length,
            emptyRows: emptyRowCount,
            validRows: validParticipants.length,
            invalidRows: invalidParticipants.length,
            duplicateEmails: [...new Set(
                allEmails.filter((email, index) =>
                    email && allEmails.indexOf(email) !== index
                )
            )].length
        };

        return {
            valid: validParticipants,
            invalid: invalidParticipants,
            headers,
            summary
        };
    } catch (error) {
        throw new Error(`Failed to parse Excel: ${error.message}`);
    }
};
