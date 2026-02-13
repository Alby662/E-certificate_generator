import { generateCertificate } from '../services/certificateGenerator.js';
import { queueBulkEmails } from '../services/mailService.js';
import { parseMultiEventExcel } from '../services/excelParser.js';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { db } from '../lib/db.js';
import { ROOT_DIR, require, DEFAULT_ORGANIZATION_NAME } from '../utils/env.js';
import { validateFields, FieldValidationError } from '../validators/fieldValidator.js';

const __dirname = ROOT_DIR;

export const createEvent = async (req, res) => {
    try {
        const { name, templatePath, fields } = req.body;

        const event = await db.event.create({
            data: {
                userId: req.user.id,
                name: name || req.body.eventName || `Project ${new Date().toISOString()}`,
                templatePath: path.basename(templatePath),
                fields: fields ? JSON.stringify(fields) : null,
                organizationName: req.body.organizationName || DEFAULT_ORGANIZATION_NAME,
                eventDate: req.body.eventDate ? new Date(req.body.eventDate) : null,
                eventType: 'standard'
            }
        });

        res.json({
            success: true,
            projectId: event.id,
            project: {
                ...event,
                id: event.id
            }
        });

    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project',
            error: error.message
        });
    }
};


export const generateCertificates = async (req, res) => {
    try {
        const { participants, templatePath, fields, projectName, projectId } = req.body;

        console.log('\n========== CERTIFICATE GENERATION REQUEST ==========');

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ success: false, message: 'Participants array required' });
        }

        if (!templatePath && !projectId) {
            return res.status(400).json({ success: false, message: 'Template path or Project ID is required' });
        }

        // 1. Find or Create Event
        let event;
        const sanitizedFilename = templatePath ? path.basename(templatePath) : null;

        if (projectId) {
            // Update existing Event (Enforce Ownership)
            event = await db.event.findFirst({
                where: {
                    id: parseInt(projectId),
                    userId: req.user.id
                }
            });

            if (event) {
                // Update
                try {
                    event = await db.event.update({
                        where: { id: event.id },
                        data: {
                            name: projectName || event.name,
                            templatePath: sanitizedFilename || event.templatePath,
                            fields: fields ? JSON.stringify(fields) : event.fields,
                            lastFieldUpdateAt: new Date()
                        }
                    });
                } catch (error) {
                    if (error.code === 'P2002') {
                        return res.status(400).json({ success: false, message: 'Event name already exists for this date. Please choose a unique name.' });
                    }
                    throw error;
                }
            } else {
                return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
            }
        }

        if (!event) {
            if (!templatePath) return res.status(400).json({ success: false, message: 'Template path required for new project' });

            event = await db.event.create({
                data: {
                    userId: req.user.id,
                    name: projectName || `Project ${new Date().toISOString()}`,
                    templatePath: sanitizedFilename,
                    fields: fields ? JSON.stringify(fields) : null,
                    organizationName: req.body.organizationName || DEFAULT_ORGANIZATION_NAME,
                    eventDate: req.body.eventDate ? new Date(req.body.eventDate) : null,
                    eventType: 'standard'
                }
            });
        }

        // 2. Queue Participants (Create PENDING records)
        const timestamp = Date.now();

        // Optimize: Use transaction or createMany if possible, but we need relations logic
        // For now, loop is safer for complex relation logic (upsert participant, etc.)
        let queuedCount = 0;

        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];

            // Find/Create Participant
            let participant = await db.participant.findUnique({
                where: { userId_email: { userId: req.user.id, email: p.email } }
            });

            if (!participant) {
                participant = await db.participant.create({
                    data: {
                        userId: req.user.id,
                        participantId: `PART-${timestamp}-${i}`,
                        email: p.email,
                        name: p.name,
                        customData: p.customData ? JSON.stringify(p.customData) : null
                    }
                });
            }

            // Create/Update EventParticipation
            // Reset status to 'pending' if it was 'failed' or allow re-generation
            const uniqueCertId = `CERT-${timestamp}-${Math.random().toString(36).substring(2, 9)}-${i}`;

            await db.eventParticipation.upsert({
                where: { participantId_eventId: { eventId: event.id, participantId: participant.id } },
                update: {
                    certificateStatus: 'pending', // Re-queue
                    certificateId: uniqueCertId, // New ID for new gen
                    emailStatus: 'pending', // Reset email status too? Maybe. Let's say yes for full regeneration.
                    // If user wants to only retry failed, they should use a different endpoint or logic.
                    // But here we assume "Generate" means "Do it for these people".
                },
                create: {
                    eventId: event.id,
                    participantId: participant.id,
                    certificateId: uniqueCertId,
                    role: 'attendee',
                    certificateStatus: 'pending',
                    emailStatus: 'pending'
                }
            });
            queuedCount++;
        }

        // 3. Trigger Background Processing
        processCertificatesBackground(event.id, req.user.id).catch(err => {
            console.error(`❌ Background processing failed for event ${event.id}:`, err);
        });

        // 4. Return Immediate Response
        res.status(202).json({
            success: true,
            message: `Generation queued for ${queuedCount} participants.`,
            projectId: event.id,
            data: {
                projectId: event.id,
                queuedCount: queuedCount,
                status: 'processing'
            }
        });

    } catch (error) {
        console.error('Generate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Internal Background Processor
const processCertificatesBackground = async (eventId, userId) => {
    console.log(`⚙️  [Background] Starting generation for Event ${eventId}`);

    try {
        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event) return;

        const TEMPLATE_DIR = path.join(ROOT_DIR, 'uploads/templates');
        const absoluteTemplatePath = path.join(TEMPLATE_DIR, event.templatePath);

        if (!fs.existsSync(absoluteTemplatePath)) {
            console.error(`❌ Template not found: ${absoluteTemplatePath}`);
            // Mark all pending as failed
            await db.eventParticipation.updateMany({
                where: {
                    eventId: eventId,
                    certificateStatus: 'pending'
                },
                data: {
                    certificateStatus: 'failed',
                    remarks: `Template not found: ${absoluteTemplatePath}`
                }
            });
            return;
        }

        // Fetch PENDING participations
        // We include participant to get name/email for generation
        let pending = await db.eventParticipation.findMany({
            where: {
                eventId: eventId,
                certificateStatus: 'pending'
            },
            include: { participant: true },
            // Limit? Maybe process all in chunks?
        });

        console.log(`   Found ${pending.length} pending certificates.`);

        const outputDir = path.join(ROOT_DIR, 'uploads/certificates');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // BATCH PROCESSING
        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES = 1000; // 1s breather

        for (let i = 0; i < pending.length; i += BATCH_SIZE) {
            const batch = pending.slice(i, i + BATCH_SIZE);
            console.log(`   Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)...`);

            // Process batch in parallel
            await Promise.all(batch.map(async (p) => {
                const uniqueCertId = p.certificateId;
                const safeName = p.participant.name ? p.participant.name.replace(/[^a-z0-9]/gi, '_').trim() : 'Participant';
                const fileName = `${uniqueCertId}_${safeName}.pdf`;
                const outputPath = path.join(outputDir, fileName);

                try {
                    // Generate PDF
                    // Safe JSON Parse for fields
                    let fields = [];
                    try {
                        fields = event.fields ? JSON.parse(event.fields) : [];
                    } catch (parseErr) {
                        console.error(`   ❌ Failed to parse fields for Event ${event.id}:`, parseErr);
                        await db.eventParticipation.update({
                            where: { id: p.id },
                            data: {
                                certificateStatus: 'failed',
                                remarks: 'Invalid request: Malformed fields JSON'
                            }
                        });
                        return; // Skip this participant
                    }

                    // CRITICAL FIX: Merge Event metadata with participant data
                    // The certificate generator looks for values in participant[f.key]
                    // We need to provide event name, date, and organization from the Event table
                    const participantData = {
                        ...p.participant, // { name, email, ... }
                        event: event.name,  // Event name from Event table
                        eventName: event.name,
                        date: event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) : new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        eventDate: event.eventDate,
                        organization: event.organizationName,
                        organizationName: event.organizationName,
                        college: event.organizationName  // Legacy field support
                    };

                    console.log(`   📝 Generating certificate for ${participantData.name} - Event: ${participantData.event} - Date: ${participantData.date}`);

                    await generateCertificate(participantData, absoluteTemplatePath, outputPath, fields);

                    // Update DB on success
                    await db.eventParticipation.update({
                        where: { id: p.id },
                        data: {
                            certificateStatus: 'generated',
                            certificatePath: fileName,
                            generatedAt: new Date()
                        }
                    });

                } catch (err) {
                    console.error(`   ❌ Failed to generate for ${p.participant.email}:`, err.message);
                    // Update DB on failure
                    await db.eventParticipation.update({
                        where: { id: p.id },
                        data: {
                            certificateStatus: 'failed',
                            remarks: `Gen Error: ${err.message}`
                        }
                    });
                }
            }));

            // Breather
            if (i + BATCH_SIZE < pending.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        console.log(`✅ [Background] Generation completed for Event ${eventId}`);

    } catch (error) {
        console.error(`❌ [Background] Critical error for Event ${eventId}:`, error);
    }
};






export const getStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const id = parseInt(eventId);

        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Event ID' });
        }

        const event = await db.event.findFirst({
            where: {
                id: id,
                userId: req.user.id
            }
        });

        if (!event) {
            return res.json({ sent: 0, failed: 0, total: 0, status: 'not_found' });
        }

        // Efficiently aggregate counts using groupBy
        const groups = await db.eventParticipation.groupBy({
            by: ['certificateStatus', 'emailStatus'],
            where: { eventId: event.id },
            _count: true
        });

        let total = 0;
        let generated = 0;
        let failedGen = 0;
        let pendingGen = 0;
        let sent = 0;
        let failedEmail = 0;

        groups.forEach(group => {
            const count = group._count || 0;
            total += count;

            if (group.certificateStatus === 'generated') generated += count;
            else if (group.certificateStatus === 'failed') failedGen += count;
            else if (group.certificateStatus === 'pending') pendingGen += count;

            if (group.emailStatus === 'sent') sent += count;
            else if (group.emailStatus === 'failed') failedEmail += count;
        });

        res.json({
            success: true,
            projectId: event.id,
            total,
            generation: {
                generated,
                failed: failedGen,
                pending: pendingGen
            },
            email: {
                sent,
                failed: failedEmail,
                pending: total - sent - failedEmail
            }
        });

    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get status' });
    }
};

export const sendEmails = async (req, res) => {
    try {
        const { projectId } = req.body;

        console.log(`📧 [sendEmails] Received request for projectId: ${projectId}`);

        // Verify Authorization
        const project = await db.event.findFirst({
            where: {
                id: parseInt(projectId),
                userId: req.user.id
            }
        });

        if (!project) {
            return res.status(403).json({ success: false, message: 'Not authorized or Project not found' });
        }

        // Trigger background queue (don't await - respond immediately)
        queueBulkEmails(projectId, null).catch(err => {
            console.error('❌ [sendEmails] Background queue error:', err);
        });

        res.json({
            success: true,
            message: 'Email sending queued.',
            projectId: projectId
        });
    } catch (error) {
        console.error('❌ [sendEmails] Controller error:', error);
        res.status(500).json({ success: false, message: 'Failed to queue emails.' });
    }
};

// BACKGROUND WORKER (Legacy/Internal functions removed as they are now handled by mailService.js)


// Helper for zip download
export const downloadZip = async (req, res) => {
    try {
        const { projectId } = req.params; // Read from URL params

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Project ID is required' });
        }

        const event = await db.event.findFirst({
            where: {
                id: parseInt(projectId),
                userId: req.user.id
            },
            include: {
                participations: true
            }
        });

        if (!event) {
            return res.status(403).json({ success: false, message: 'Project not found or unauthorized' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment(`certificates_${event.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
        archive.pipe(res);

        const certificateDir = path.join(ROOT_DIR, 'uploads/certificates');
        let count = 0;

        for (const p of event.participations) {
            if (p.certificatePath) {
                const filePath = path.join(certificateDir, p.certificatePath);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: path.basename(filePath) });
                    count++;
                }
            }
        }

        await archive.finalize();
        console.log(`ZIP archive sent: ${count} files`);

    } catch (error) {
        console.error('Zip error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to create zip file', error: error.message });
        }
    }
};

// NEW: Event Management API (Phase C)
export const getEvents = async (req, res) => {
    try {
        const events = await db.event.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { participations: true }
                }
            }
        });

        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await db.event.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            },
            include: {
                participations: {
                    include: { participant: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await db.event.findUnique({
            where: { id: parseInt(id), userId: req.user.id }
        });

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Delete (Cascade will handle participations)
        await db.event.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generatePreview = async (req, res) => {
    console.log('\n🚀 [PREVIEW] ========== REQUEST RECEIVED ==========');
    try {
        const { projectId, eventId, participantIndex = 0, templatePath, fields, participant } = req.body;
        let targetParticipant, targetTemplatePath, targetFields;

        // Use either projectId or eventId for backward compatibility
        const targetIdString = eventId || projectId;
        const targetId = targetIdString ? parseInt(targetIdString) : null;

        // MODE 1: Project (Event) exists
        if (targetId && !isNaN(targetId)) {
            const event = await db.event.findUnique({
                where: { id: targetId, userId: req.user.id },
                include: { participations: { include: { participant: true } } }
            });

            if (!event) return res.status(404).json({ error: 'Project not found' });

            // PRIORITY 1: Use provided participant and fields (for live design feedback)
            if (participant) {
                targetParticipant = participant;
                targetFields = fields || event.fields;
                targetTemplatePath = templatePath || event.templatePath;
            }
            // PRIORITY 2: Fallback to existing participations in DB
            else if (event.participations.length > 0) {
                const activeParticipation = event.participations[participantIndex];
                if (!activeParticipation) return res.status(400).json({ error: 'Participant index out of bounds' });

                targetParticipant = activeParticipation.participant;
                targetFields = event.fields;
                targetTemplatePath = event.templatePath;
            } else {
                return res.status(400).json({ error: 'No participants available for preview. Please upload data or provide sample participant.' });
            }
        }
        // MODE 2: Design-first (Independent of DB)
        else if (templatePath && fields && participant) {
            targetParticipant = participant;
            targetTemplatePath = templatePath;
            targetFields = fields;
        } else {
            return res.status(400).json({ error: 'Missing required parameters: Provide Project ID or (Template + Fields + Participant)' });
        }

        // Path Sanitization & Resolution
        const filename = path.basename(targetTemplatePath);
        const absoluteTemplatePath = path.join(ROOT_DIR, 'uploads', 'templates', filename);

        if (!fs.existsSync(absoluteTemplatePath)) {
            return res.status(404).json({ error: 'Template file not found' });
        }

        // Fields Parsing & Validation
        let parsedFields;
        try {
            parsedFields = typeof targetFields === 'string' ? JSON.parse(targetFields) : targetFields;
            validateFields(parsedFields);
        } catch (error) {
            if (error instanceof SyntaxError) {
                console.error("Invalid targetFields JSON:", error);
                return res.status(400).json({ error: "Invalid targetFields JSON" });
            }
            if (error instanceof FieldValidationError) {
                return res.status(400).json({ error: error.message, field: error.field });
            }
            throw error;
        }

        // Preview Directory
        const previewDir = path.join(ROOT_DIR, 'uploads', 'previews');
        if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

        const outputPath = path.join(previewDir, `preview_${Date.now()}.pdf`);

        // CRITICAL FIX: Merge Event metadata if available (MODE 1 only)
        // In MODE 2 (design-first), event might not exist
        let enrichedParticipant = targetParticipant;
        if (targetId && !isNaN(targetId)) {
            // Event is available from MODE 1 scope above
            const event = await db.event.findUnique({
                where: { id: targetId, userId: req.user.id }
            });

            if (event) {
                enrichedParticipant = {
                    ...targetParticipant,
                    event: event.name,
                    eventName: event.name,
                    date: event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) : new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    eventDate: event.eventDate,
                    organization: event.organizationName,
                    organizationName: event.organizationName,
                    college: event.organizationName
                };
            }
        }

        // Generate
        await generateCertificate(enrichedParticipant, absoluteTemplatePath, outputPath, parsedFields);

        // Send & Cleanup
        res.sendFile(outputPath, (err) => {
            if (err) {
                console.error('Error sending preview:', err);
                if (!res.headersSent) res.status(500).json({ error: 'Failed to send preview' });
            }
            // Cleanup after 10s
            setTimeout(() => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 10000);
        });

    } catch (error) {
        console.error("Preview Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const approvePreview = async (req, res) => {
    try {
        const { eventId } = req.params;
        const id = parseInt(eventId);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid Event ID' });
        }

        try {
            const event = await db.event.update({
                where: {
                    id: id,
                    userId: req.user.id
                },
                data: {
                    previewApproved: true,
                    previewApprovedAt: new Date()
                }
            });

            res.json({
                success: true,
                message: 'Preview approved successfully',
                project: { ...event, id: event.id }
            });
        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Event not found or unauthorized' });
            }
            throw error;
        }

    } catch (error) {
        console.error('[Approve] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const importMultiEventExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const filePath = req.file.path;

        // Parse Excel
        const parseResult = parseMultiEventExcel(filePath);

        if (parseResult.errors.length > 0 && parseResult.summary.validRows === 0) {
            // If ALL rows failed, return 400
            return res.status(400).json({
                success: false,
                error: 'Excel validation failed for all rows',
                details: parseResult.errors,
                summary: parseResult.summary
            });
        }

        // Return parsed data for frontend review
        // Even if some errors exist, return the partial success so user can see what worked
        res.json({
            success: true,
            data: {
                participants: parseResult.participants,
                events: parseResult.events,
                participations: parseResult.participations,
                summary: parseResult.summary,
                errors: parseResult.errors
            }
        });

    } catch (error) {
        console.error('Multi-event import failed', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const createMultiEventProject = async (req, res) => {
    try {
        const {
            projectName,           // Overall project name (e.g., "Technophelia 4.0")
            templatePath,
            fields,
            participations,        // Array from Excel parse
            events,                // Array of event names
            eventDate,
            eventType,
            organizationName
        } = req.body;

        // Step 1: Create or get participants in registry
        const participantMap = new Map();  // email -> participant ID

        // Optimization: Fetch all existing participants at once if possible or do lazily?
        // For 300 items, sequential might be a bit slow but safer.
        // Let's do a bulk read first.
        const emails = [...new Set(participations.map(p => p.email))];
        const existingParticipants = await db.participant.findMany({
            where: {
                email: { in: emails },
                userId: req.user.id
            }
        });

        existingParticipants.forEach(p => participantMap.set(p.email, p.id));

        // Wrap everything in a transaction for atomicity
        const result = await db.$transaction(async (tx) => {
            // Step 1: Create missing participants
            for (const p of participations) {
                if (!participantMap.has(p.email)) {
                    const participantId = `PART-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const newP = await tx.participant.create({
                        data: {
                            userId: req.user.id,
                            participantId,
                            name: p.name,
                            email: p.email
                        }
                    });
                    participantMap.set(p.email, newP.id);
                }
            }

            // Step 2: Create Events (one for each unique event name) with individual metadata
            const eventMap = new Map();
            const eventCreationPromises = events.map(async (eventData) => {
                // Support both string[] (legacy) and object[] (new format with metadata)
                const eventName = typeof eventData === 'string' ? eventData : eventData.name;
                const eventMeta = typeof eventData === 'object' ? eventData : {};

                const event = await tx.event.create({
                    data: {
                        userId: req.user.id,
                        name: `${projectName} - ${eventName}`,
                        eventDate: eventMeta.eventDate
                            ? new Date(eventMeta.eventDate)
                            : (eventDate ? new Date(eventDate) : null),
                        eventType: eventMeta.eventType || eventType || 'standard',
                        organizationName: eventMeta.organizationName || organizationName || DEFAULT_ORGANIZATION_NAME,
                        templatePath: path.basename(templatePath),
                        fields: JSON.stringify(fields)
                    }
                });
                return { eventName, id: event.id };
            });

            const createdEvents = await Promise.all(eventCreationPromises);
            createdEvents.forEach(e => eventMap.set(e.eventName, e.id));

            // Step 3: Create EventParticipations
            const createdParticipations = [];

            for (const p of participations) {
                const participantId = participantMap.get(p.email);
                const eventId = eventMap.get(p.eventName);
                const uniqueCertId = `CERT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

                const eventParticipation = await tx.eventParticipation.upsert({
                    where: {
                        participantId_eventId: {
                            participantId: participantId,
                            eventId: eventId
                        }
                    },
                    update: {
                        certificateStatus: 'pending',
                        emailStatus: 'pending'
                    },
                    create: {
                        participantId,
                        eventId,
                        certificateId: uniqueCertId,
                        certificateStatus: 'pending',
                        emailStatus: 'pending'
                    }
                });

                createdParticipations.push({
                    participantEmail: p.email,
                    participantName: p.name,
                    eventName: p.eventName,
                    certificateId: eventParticipation.certificateId,
                    participationId: eventParticipation.id
                });
            }

            return {
                eventMap: Array.from(eventMap.entries()).map(([name, id]) => ({ name, id })),
                participations: createdParticipations,
                uniqueParticipants: participantMap.size
            };
        });

        res.json({
            success: true,
            message: `Created ${events.length} events with ${result.participations.length} participations`,
            data: {
                events: result.eventMap,
                participations: result.participations,
                summary: {
                    uniqueParticipants: result.uniqueParticipants,
                    totalEvents: events.length,
                    totalCertificates: result.participations.length
                }
            }
        });

    } catch (error) {
        console.error('Multi-event project creation failed', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
