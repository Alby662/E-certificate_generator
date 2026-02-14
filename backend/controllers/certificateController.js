import { generateCertificate } from '../services/certificateGenerator.js';
import { sendBulkEmails, sendEmailWithRetry } from '../services/mailService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { db } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createProject = async (req, res) => {
    try {
        const { name, templatePath, fields } = req.body;

        const project = await db.project.create({
            data: {
                userId: req.user.id,
                name: name || `Project ${new Date().toISOString()}`,
                templatePath: path.basename(templatePath),
                fields: fields ? JSON.stringify(fields) : null
            }
        });

        res.json({
            success: true,
            projectId: project.id,
            project
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
        // ... (logging omitted for brevity)

        // Validation ...
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ success: false, message: 'Participants array required' });
        }

        if (!templatePath) {
            return res.status(400).json({ success: false, message: 'Template path is required' });
        }

        // SECURITY FIX ...
        const TEMPLATE_DIR = path.join(__dirname, '../uploads/templates');
        const sanitizedFilename = path.basename(templatePath);
        const absoluteTemplatePath = path.join(TEMPLATE_DIR, sanitizedFilename);

        if (!fs.existsSync(absoluteTemplatePath)) {
            return res.status(400).json({ success: false, message: 'Template file not found' });
        }

        let project;

        // LOGIC REPAIR: Check if project already exists
        if (projectId) {
            console.log(`[Generation] Updating existing project: ${projectId}`);
            try {
                // Verify ownership
                project = await db.project.findUnique({
                    where: { id: parseInt(projectId), userId: req.user.id }
                });

                if (project) {
                    // Update project details
                    project = await db.project.update({
                        where: { id: project.id },
                        data: {
                            name: projectName || project.name,
                            templatePath: sanitizedFilename,
                            fields: fields ? JSON.stringify(fields) : project.fields,
                            lastFieldUpdateAt: new Date()
                        }
                    });

                    // CLEANUP: Delete old participants to avoid duplication logic issues
                    // because we generate new unique Certificate IDs anyway.
                    // This keeps the database clean.
                    const deleteResult = await db.participant.deleteMany({
                        where: { projectId: project.id }
                    });
                    console.log(`[Generation] Cleared ${deleteResult.count} old participants`);

                } else {
                    console.warn(`[Generation] Project ${projectId} not found/owned by user. Creating new.`);
                }
            } catch (err) {
                console.error('[Generation] Error updating project, falling back to create:', err);
                project = null; // Fallback
            }
        }

        if (!project) {
            console.log(`[Generation] Creating NEW project`);
            project = await db.project.create({
                data: {
                    userId: req.user.id,
                    name: projectName || `Project ${new Date().toISOString()}`,
                    templatePath: sanitizedFilename,
                    fields: fields ? JSON.stringify(fields) : null
                }
            });
        }

        const outputDir = path.join(__dirname, '../uploads/certificates');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generatedFiles = [];
        const participantRecords = [];

        // Process each participant
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            const randomSuffix = Math.random().toString(36).substring(2, 9);
            const timestamp = Date.now();
            const uniqueCertId = `CERT-${timestamp}-${randomSuffix}-${i}`;

            // Generate PDF file details
            const safeName = p.name ? p.name.replace(/[^a-z0-9]/gi, '_').trim() : 'Participant';
            const fileName = `${uniqueCertId}_${safeName}.pdf`;
            const outputPath = path.join(outputDir, fileName);

            // Generate PDF
            if (!fs.existsSync(outputPath)) {
                await generateCertificate(p, absoluteTemplatePath, outputPath, fields);
            }

            // Create WITHOUT upsert if we cleared data, or proper upsert
            // Since we use uniqueCertId which is NEW every time, Upsert acts as Create.
            const participantRecord = await db.participant.create({
                data: {
                    projectId: project.id,
                    name: p.name,
                    email: p.email,
                    certificateId: uniqueCertId,
                    customData: p.customData ? JSON.stringify(p.customData) : null,
                    certificate: {
                        create: { filePath: fileName }
                    }
                },
                include: { certificate: true }
            });

            generatedFiles.push({
                certificateId: participantRecord.certificateId,
                fileName: fileName,
                participantId: participantRecord.id,
                dbCertificateId: participantRecord.certificate.id
            });
        }

        res.json({
            success: true,
            message: `Generated ${generatedFiles.length} certificates`,
            data: {
                projectId: project.id,
                generatedCount: generatedFiles.length,
                certificates: generatedFiles
            }
        });

    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Certificate generation failed',
            error: error.message
        });
    }
};

// DATABASE-BACKED EMAIL STATUS (Replaces in-memory store)

export const sendEmails = async (req, res) => {
    try {
        const { projectId } = req.body;
        // We ignore 'certificates' map from frontend and trust the DB, 
        // as Project ID Lifecycle fix ensures DB is consistent.

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Project ID is required' });
        }

        console.log(`[Email] Request to send emails for Project ${projectId}`);

        // 1. Fetch Project & Participants
        const project = await db.project.findUnique({
            where: { id: parseInt(projectId), userId: req.user.id },
            include: {
                participants: {
                    include: { certificate: true }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const participants = project.participants;
        if (participants.length === 0) {
            return res.status(400).json({ success: false, message: 'No participants found in this project' });
        }

        // 2. Initialize Status in DB
        await db.project.update({
            where: { id: project.id },
            data: {
                emailStatus: 'in_progress',
                emailStartedAt: new Date(),
                emailSentCount: 0,
                emailFailedCount: 0
            }
        });

        // 3. Create Email Logs (Pending)
        // Delete old logs if any (retry logic validation)
        await db.emailLog.deleteMany({ where: { participant: { projectId: project.id } } });

        await db.emailLog.createMany({
            data: participants.map(p => ({
                participantId: p.id,
                status: 'pending'
            }))
        });

        // 4. Start Background Process
        sendEmailsInBackground(project.id, participants);

        // 5. Respond immediately
        res.json({
            success: true,
            message: 'Email sending started',
            projectId: project.id
        });

    } catch (error) {
        console.error('Email sending initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start email sending',
            error: error.message
        });
    }
};

export const getStatus = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await db.project.findUnique({
            where: { id: parseInt(projectId), userId: req.user.id }
        });

        if (!project) {
            return res.json({ sent: 0, failed: 0, total: 0, status: 'not_found' });
        }

        const total = await db.participant.count({ where: { projectId: project.id } });

        res.json({
            success: true,
            projectId: project.id,
            status: project.emailStatus,
            sent: project.emailSentCount,
            failed: project.emailFailedCount,
            total: total
        });

    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ success: false, message: 'Failed to get status' });
    }
};

// BACKGROUND WORKER
async function sendEmailsInBackground(projectId, participants) {
    console.log(`[Worker] Starting background email job for Project ${projectId} (${participants.length} emails)`);

    const BATCH_SIZE = 5;
    const DELAY_MS = 2000;
    const certificateDir = path.join(__dirname, '../uploads/certificates');

    // Fetch project to get fields configuration
    const project = await db.project.findUnique({
        where: { id: projectId }
    });

    // Extract event name from certificate fields
    let eventName = 'Asgardian Realms Rangoli';
    let organizationName = 'ACSES Team';

    if (project && project.fields) {
        try {
            const fields = JSON.parse(project.fields);
            // Find the field with the event/title text
            // Look for common field types that contain the event name
            const eventField = fields.find(f =>
                f.type === 'text' &&
                (f.label?.toLowerCase().includes('event') ||
                    f.label?.toLowerCase().includes('title') ||
                    f.label?.toLowerCase().includes('certificate'))
            );
            if (eventField && eventField.text) {
                eventName = eventField.text;
            }

            // You can also extract organization if needed
            const orgField = fields.find(f =>
                f.type === 'text' &&
                (f.label?.toLowerCase().includes('organization') ||
                    f.label?.toLowerCase().includes('college'))
            );
            if (orgField && orgField.text) {
                organizationName = orgField.text;
            }
        } catch (e) {
            console.warn('[Worker] Failed to parse project fields for event name:', e);
        }
    }

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
        const batch = participants.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (p) => {
            // Check if certificate exists
            if (!p.certificate || !p.certificate.filePath) {
                await logEmailFailure(p.id, projectId, 'No certificate file linked');
                return;
            }

            const absPath = path.join(certificateDir, p.certificate.filePath);

            // Enhance participant object with event and organization info
            const enhancedParticipant = {
                ...p,
                event: eventName,
                college: organizationName
            };

            // Send
            const result = await sendEmailWithRetry(enhancedParticipant, absPath);

            if (result.success) {
                // Update Log
                await db.emailLog.updateMany({
                    where: { participantId: p.id },
                    data: { status: 'sent', sentAt: new Date(), attempts: result.attempts }
                });
                // Update Project Count (Atomic increment)
                await db.project.update({
                    where: { id: projectId },
                    data: { emailSentCount: { increment: 1 } }
                });
            } else {
                await logEmailFailure(p.id, projectId, result.error || 'Unknown SMTP error');
            }
        }));

        if (i + BATCH_SIZE < participants.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    // Finish
    await db.project.update({
        where: { id: projectId },
        data: {
            emailStatus: 'completed',
            emailCompletedAt: new Date()
        }
    });
    console.log(`[Worker] Job completed for Project ${projectId}`);
}

async function logEmailFailure(participantId, projectId, message) {
    try {
        await db.emailLog.updateMany({
            where: { participantId: participantId },
            data: { status: 'failed', errorMessage: message }
        });
        await db.project.update({
            where: { id: projectId },
            data: { emailFailedCount: { increment: 1 } }
        });
    } catch (e) {
        console.error('Failed to log email failure to DB:', e);
    }
}

// Helper for zip download
export const downloadZip = async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: 'Project ID is required'
            });
        }

        // Verify project belongs to user
        const project = await db.project.findFirst({
            where: {
                id: parseInt(projectId),
                userId: req.user.id
            },
            include: {
                participants: {
                    include: {
                        certificate: true // Was 'certificates' in view, but schema says 'certificate' (singular relation)
                        // Wait, schema says `certificate Certificate?`
                        // View output line 396 in previous file view showed `certificates: true`? 
                        // Let's check schema again. Step 854: `certificate Certificate?`.
                        // Step 883 view showed `certificates: true` in downloadZip?
                        // Line 396: `certificates: true`.
                        // Line 414: `for (const cert of participant.certificates)`
                        // The `downloadZip` in step 883 was accessing a generic property (maybe legacy code?).
                        // BUT Schema says `certificate` (singular).
                        // I must fix `downloadZip` to use `.certificate` NOT `.certificates`.
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        // Get all certificate file paths
        const certificateDir = path.join(__dirname, '../uploads/certificates');
        const filePaths = [];

        for (const participant of project.participants) {
            // Corrected access: participant.certificate
            const cert = participant.certificate;
            if (cert && cert.filePath) {
                const fullPath = path.join(certificateDir, cert.filePath);
                if (fs.existsSync(fullPath)) {
                    filePaths.push(fullPath);
                } else {
                    console.warn(`Certificate file not found: ${cert.filePath}`);
                }
            }
        }

        if (filePaths.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No certificates found for this project'
            });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment(`certificates_${project.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
        archive.pipe(res);

        filePaths.forEach(filePath => {
            archive.file(filePath, { name: path.basename(filePath) });
        });

        await archive.finalize();
        console.log(`ZIP archive sent: ${filePaths.length} files`);

    } catch (error) {
        console.error('Zip error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create zip file',
            error: error.message
        });
    }
};
