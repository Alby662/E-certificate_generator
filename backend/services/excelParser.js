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
const COLUMN_MAPPINGS = {
    name: ['name', 'fullname', 'full name', 'student name', 'participant name', 'recipient name', 'full name (as required on certificate)'],
    email: ['email', 'email id', 'mail', 'email address', 'e-mail', 'email id (registered / active)'],
    phone: ['phone', 'mobile', 'contact', 'whatsapp', 'phone number'],
    timestamp: ['timestamp', 'time', 'date', 'submission date']
};

const findHeader = (headers, key) => {
    const validAliases = COLUMN_MAPPINGS[key] || [key];
    return headers.find(h => validAliases.includes(h.toLowerCase().trim()));
};

export const parseExcel = (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const data = xlsx.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            throw new Error('Excel file is empty or has no data rows');
        }

        const headers = Object.keys(data[0]);

        // Resolve headers
        const nameHeader = findHeader(headers, 'name');
        const emailHeader = findHeader(headers, 'email');
        const certIdHeader = findHeader(headers, 'certificate_id') || 'certificate_id';

        const missingColumns = [];
        if (!nameHeader) missingColumns.push('name');
        if (!emailHeader) missingColumns.push('email');

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Found: ${headers.join(', ')}`);
        }

        // Collect all emails for duplicate detection
        const allEmails = data.map(row => row[emailHeader] ? row[emailHeader].trim().toLowerCase() : '');

        const validParticipants = [];
        const invalidParticipants = [];
        let emptyRowCount = 0;

        data.forEach((row, index) => {
            // Normalize row for validation (map real headers to canonical keys)
            const normalizedRow = {
                name: row[nameHeader],
                email: row[emailHeader],
                certificate_id: row[certIdHeader]
            };

            const validation = validateParticipantRow(normalizedRow, index, allEmails);

            if (validation.isEmpty) {
                emptyRowCount++;
                return;
            }

            const participantData = {
                rowNumber: index + 2,
                name: normalizedRow.name?.trim() || '',
                email: normalizedRow.email?.trim().toLowerCase() || '',
                customData: {}
            };

            // Capture other columns as customData
            headers.forEach(header => {
                if (header !== nameHeader && header !== emailHeader && header !== certIdHeader) {
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

export const parseMultiEventExcel = (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
            throw new Error('Excel file is empty or has no data rows');
        }

        // Detect Headers
        const headers = Object.keys(rows[0]);
        const nameHeader = findHeader(headers, 'name') || 'Full Name';
        const emailHeader = findHeader(headers, 'email') || 'Email';
        const timestampHeader = findHeader(headers, 'timestamp') || 'Timestamp';

        // Detect Event Columns (Looking for "Event 1", "Event 2" or typical variations)
        const eventColumns = headers.filter(h => h.toLowerCase().includes('event'));

        if (eventColumns.length === 0) {
            throw new Error('No columns containing "Event" found (e.g., Event 1, Event 2)');
        }

        const results = {
            participants: new Map(),  // key: email, value: participant data
            events: new Set(),        // unique event names
            participations: [],       // array of {email, eventName, timestamp}
            errors: [],
            summary: {
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                totalEvents: 0,
                totalParticipations: 0,
                participantsWithMultipleEvents: 0
            }
        };

        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            results.summary.totalRows++;

            try {
                // Extract and validate basic data
                const name = (row[nameHeader] || '').trim();
                const email = (row[emailHeader] || '').trim().toLowerCase();
                const timestamp = row[timestampHeader];

                // Validation
                if (!name) throw new Error('Name is required');
                if (!email) throw new Error('Email is required');

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) throw new Error('Invalid email format');

                // Store participant (deduplicate by email)
                if (!results.participants.has(email)) {
                    results.participants.set(email, {
                        name,
                        email,
                        firstRegistration: timestamp
                    });
                }

                // Extract events from detected event columns
                const eventsFound = [];
                eventColumns.forEach(col => {
                    const val = row[col];
                    if (val && typeof val === 'string' && val.trim() !== '') {
                        eventsFound.push(val.trim());
                    }
                });

                if (eventsFound.length === 0) {
                    // It's possible a valid row just has no events if they didn't participate?
                    // Requirement says "Key Challenge: Each row can have 1-3 events."
                    // Let's assume at least one is needed to be useful.
                    // But maybe not strictly an error if we just want to skip?
                    // Let's throw error for now to be safe.
                    throw new Error('No events found in this row');
                }

                // Create participation records
                const effectiveTimestamp = timestamp || new Date().toISOString();
                eventsFound.forEach(eventName => {
                    results.events.add(eventName);
                    results.participations.push({
                        email,
                        name,
                        eventName,
                        timestamp: effectiveTimestamp
                    });
                    results.summary.totalParticipations++;
                });

                results.summary.validRows++;

            } catch (error) {
                results.summary.invalidRows++;
                results.errors.push({
                    row: rowNumber,
                    data: row,
                    error: error.message
                });
            }
        });

        // Calculate summary statistics
        results.summary.totalEvents = results.events.size;

        // Find participants with multiple unique events
        const uniqueEventsByEmail = new Map();
        results.participations.forEach(p => {
            if (p.eventName) {
                if (!uniqueEventsByEmail.has(p.email)) {
                    uniqueEventsByEmail.set(p.email, new Set());
                }
                uniqueEventsByEmail.get(p.email).add(p.eventName);
            }
        });

        uniqueEventsByEmail.forEach(eventsSet => {
            if (eventsSet.size > 1) {
                results.summary.participantsWithMultipleEvents++;
            }
        });

        return {
            participants: Array.from(results.participants.values()),
            events: Array.from(results.events),
            participations: results.participations,
            errors: results.errors,
            summary: results.summary
        };

    } catch (error) {
        throw new Error(`Failed to parse Multi-Event Excel: ${error.message}`);
    }
};
