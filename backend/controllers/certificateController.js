import { generateCertificate } from '../services/certificateGenerator.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { db } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateCertificates = async (req, res) => {
    try {
        const { participants, templatePath, fields, projectName } = req.body;

        console.log('\n========== CERTIFICATE GENERATION REQUEST ==========');
        console.log('Check 1: Participants -', participants?.length, 'entries');
        console.log('Check 2: Template Path (raw) -', templatePath);
        console.log('Check 3: Fields -', fields?.length, 'field definitions');
        console.log('Check 4: Project Name -', projectName);

        // Validation
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            console.error('[VALIDATION FAILED] Participants:', participants);
            return res.status(400).json({
                success: false,
                message: 'Participants array is required and must not be empty'
            });
        }

        if (!templatePath) {
            console.error('[VALIDATION FAILED] Template path is missing');
            return res.status(400).json({ success: false, message: 'Template path is required' });
        }

        // SECURITY FIX: Prevent path traversal attacks
        const TEMPLATE_DIR = path.join(__dirname, '../uploads/templates');

        // Sanitize the path: only use the basename to prevent directory traversal
        const sanitizedFilename = path.basename(templatePath);
        const absoluteTemplatePath = path.join(TEMPLATE_DIR, sanitizedFilename);

        console.log(`\n----- PATH RESOLUTION -----`);
        console.log(`Received: "${templatePath}"`);
        console.log(`Sanitized: "${sanitizedFilename}"`);
        console.log(`Template Dir: "${TEMPLATE_DIR}"`);
        console.log(`Absolute Path: "${absoluteTemplatePath}"`);

        // WINDOWS FIX: Normalize paths to lowercase before comparison
        // This handles Windows path casing inconsistencies (e:\ vs E:\)
        const normalizedDir = path.resolve(TEMPLATE_DIR).toLowerCase();
        const normalizedPath = path.resolve(absoluteTemplatePath).toLowerCase();

        console.log(`Normalized Dir: "${normalizedDir}"`);
        console.log(`Normalized Path: "${normalizedPath}"`);
        console.log(`Path starts with Template Dir: ${normalizedPath.startsWith(normalizedDir)}`);
        console.log(`File Exists: ${fs.existsSync(absoluteTemplatePath)}`);

        // Verify the resolved path is still within the allowed directory
        // Use normalized paths to handle Windows casing issues
        if (!normalizedPath.startsWith(normalizedDir)) {
            console.error(`\n[SECURITY BLOCK] Path traversal attempt!`);
            console.error(`  Expected to start with: ${normalizedDir}`);
            console.error(`  But got: ${normalizedPath}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid template path: access denied'
            });
        }

        if (!fs.existsSync(absoluteTemplatePath)) {
            console.error(`[Error] Template file not found: ${absoluteTemplatePath}`);
            return res.status(400).json({ success: false, message: 'Template file not found' });
        }

        console.log(`[Success] Template file verified at: ${absoluteTemplatePath}`);

        // Create project in database
        const project = await db.project.create({
            data: {
                userId: req.user.userId,
                name: projectName || `Project ${new Date().toISOString()}`,
                templatePath: sanitizedFilename,
                fields: fields ? JSON.stringify(fields) : null
            }
        });

        const outputDir = path.join(__dirname, '../uploads/certificates');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const generatedFiles = [];
        const participantRecords = [];

        // Process each participant
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];

            // ALWAYS generate NEW unique certificate ID server-side
            // NEVER use client-provided IDs (security + uniqueness)
            const randomSuffix = Math.random().toString(36).substring(2, 9);
            const timestamp = Date.now();
            const uniqueCertId = `CERT-${timestamp}-${randomSuffix}-${i}`;

            console.log(`[Participant ${i + 1}/${participants.length}] ${p.name} - ID: ${uniqueCertId}`);

            // Generate PDF file details
            const safeName = p.name ? p.name.replace(/[^a-z0-9]/gi, '_').trim() : 'Participant';
            const fileName = `${uniqueCertId}_${safeName}.pdf`;
            const outputPath = path.join(outputDir, fileName);

            // Only generate PDF if it doesn't already exist (idempotency)
            if (!fs.existsSync(outputPath)) {
                await generateCertificate(p, absoluteTemplatePath, outputPath, fields);
                console.log(`  ✅ PDF generated`);
            } else {
                console.log(`  ⏭️  PDF exists, skipping`);
            }

            // PROFESSIONAL PATTERN: Nested Write - Atomic creation
            // Create participant and certificate in SINGLE operation
            // If duplicate request, reuses existing records
            const participantRecord = await db.participant.upsert({
                where: { certificateId: uniqueCertId },
                update: {
                    // If participant exists, update certificate path if changed
                    certificate: {
                        upsert: {
                            create: { filePath: fileName },
                            update: { filePath: fileName }
                        }
                    }
                },
                create: {
                    projectId: project.id,
                    name: p.name,
                    email: p.email,
                    certificateId: uniqueCertId,
                    customData: p.customData ? JSON.stringify(p.customData) : null,
                    // NESTED CREATE: Create certificate record at same time
                    certificate: {
                        create: { filePath: fileName }
                    }
                },
                include: {
                    certificate: true  // Return certificate data in response
                }
            });

            console.log(`  💾 Database record ${participantRecord.id} saved`);

            generatedFiles.push({
                certificateId: participantRecord.certificateId,
                fileName: fileName,
                participantId: participantRecord.id,
                dbCertificateId: participantRecord.certificate.id
            });

            participantRecords.push(participantRecord);
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
                userId: req.user.userId
            },
            include: {
                participants: {
                    include: {
                        certificates: true
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
            for (const cert of participant.certificates) {
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
