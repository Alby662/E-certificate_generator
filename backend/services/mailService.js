import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logEmail } from '../utils/logger.js';
import { db } from '../lib/db.js';
import { ROOT_DIR } from '../utils/env.js';

dotenv.config();



const transporter = nodemailer.createTransport({
    service: 'gmail', // Or generic SMTP
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

console.log(`📧 Configuring email service for: ${process.env.EMAIL_USER}`);

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ SMTP Connection Error:');
        console.error(error);
    } else {
        console.log('✅ SMTP Server is ready to take our messages');
    }
});

// Load email template
let cachedEmailTemplate = null;

const getEmailTemplate = (participant, metadata = {}) => {
    if (!cachedEmailTemplate) {
        const templatePath = path.join(ROOT_DIR, 'templates/emailTemplate.html');
        cachedEmailTemplate = fs.readFileSync(templatePath, 'utf-8');
    }
    let template = cachedEmailTemplate;

    // Replace variables
    template = template.replace(/{{name}}/g, participant.name);
    template = template.replace(/{{event}}/g, metadata.eventName || participant.event || 'Event');
    template = template.replace(/{{organization}}/g, metadata.organizationName || participant.college || 'Organization');
    // Format date consistently (YYYY-MM-DD)
    const getFormattedDate = (dateVal) => {
        if (!dateVal) return new Date().toISOString().split('T')[0];
        const date = new Date(dateVal);
        return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    };
    template = template.replace(/{{date}}/g, getFormattedDate(metadata.eventDate));

    return template;
};

export const sendEmail = async (participant, attachmentPath, metadata = {}) => {
    console.log(`Attempting to send email to ${participant.email} with attachment: ${attachmentPath}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ Missing email credentials in .env file");
        return { success: false, error: "Missing email credentials. Please check backend/.env" };
    }

    try {
        if (!fs.existsSync(attachmentPath)) {
            console.error(`❌ Attachment not found at path: ${attachmentPath}`);
            return { success: false, error: `Attachment not found: ${attachmentPath}` };
        }

        const html = getEmailTemplate(participant, metadata);

        const attachments = [
            {
                filename: `Certificate_${participant.certificate_id}.pdf`,
                path: attachmentPath,
            }
        ];

        const logoPath = path.join(ROOT_DIR, 'assets/logo.png');
        if (fs.existsSync(logoPath)) {
            attachments.push({
                filename: 'logo.png',
                path: logoPath,
                cid: 'orgLogo'
            });
        }

        const eventName = metadata.eventName || participant.event || 'Event';
        const organizationName = metadata.organizationName || participant.college || 'Organization';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: participant.email,
            subject: `Certificate for ${eventName}`,
            html: html,
            text: `Dear ${participant.name},\n\nCongratulations! We're pleased to present you with your certificate for ${eventName}.\n\nYour certificate PDF is attached to this email.\n\nBest regards,\nThe ${organizationName} Team\n\nThis is an automated email. Please do not reply.`,
            attachments: attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${participant.email}. Message ID: ${info.messageId}`);

        // Log successful send
        logEmail('INFO', 'Email sent successfully', {
            status: 'sent',
            recipient: participant.email,
            messageId: info.messageId,
            event: eventName
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${participant.email}:`);
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Error Message: ${error.message}`);
        if (error.response) console.error(`   SMTP Response: ${error.response}`);

        // Categorize the error for better user feedback
        const errorInfo = categorizeEmailError(error);
        console.error(`   Error Category: ${errorInfo.category}`);
        console.error(`   User Message: ${errorInfo.userMessage}`);

        // Log failed send
        logEmail('ERROR', 'Email send failed', {
            status: 'failed',
            recipient: participant.email,
            errorCategory: errorInfo.category,
            errorMessage: errorInfo.userMessage,
            technicalError: errorInfo.technical,
            event: participant.event
        });

        return {
            success: false,
            error: errorInfo.userMessage,
            errorCategory: errorInfo.category,
            technicalError: errorInfo.technical
        };
    }
};

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelays: [1000, 2000, 4000], // 1s, 2s, 4s - exponential backoff
};

/**
 * Send email with automatic retry on failure
 * @param {object} participant - Participant data
 * @param {string} attachmentPath - Path to certificate PDF
 * @param {object} [metadata] - Optional metadata for the email (used for headers/logging)
 * @param {number} attemptNumber - Current attempt number (internal)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, attempts: number}>}
 */
export const sendEmailWithRetry = async (participant, attachmentPath, metadata = {}, attemptNumber = 1) => {
    console.log(`📧 [Attempt ${attemptNumber}/${RETRY_CONFIG.maxRetries + 1}] Sending to ${participant.email}`);

    const result = await sendEmail(participant, attachmentPath, metadata);

    // If failed and we haven't exhausted retries, try again
    if (!result.success && attemptNumber <= RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelays[attemptNumber - 1] || 4000;
        console.log(`⏳ Retry scheduled in ${delay}ms for ${participant.email}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendEmailWithRetry(participant, attachmentPath, metadata, attemptNumber + 1);
    }

    // Return result with attempt count
    return {
        ...result,
        attempts: attemptNumber
    };
};


// Queue Bulk Emails (Throttled)
export const queueBulkEmails = async (eventId, updateStatusCallback) => {
    console.log(`📧 [Email Queue] Starting for Event ${eventId}`);

    // Fetch recipients: Generated certificates that haven't been sent successfully
    // Note: We need to import db here or pass it in. db is in ../lib/db.js
    // Since this is a service, maybe we should pass the participants array? 
    // But the requirements say "Select records where certificateStatus === 'GENERATED'..."
    // So we need DB access. Let's import it.

    // Lazy import to avoid circular dependencies if any, or just standard import
    // We need to add `import { db } from '../lib/db.js';` at top of file.
    // For now, assuming caller passes participants or we fetch them here.
    // The requirement: "Create a queueBulkEmails function... Logic: Select records..."
    // So I will add db import at top (via separate edit) or assume it's available.
    // I'll add the import in a separate replace block to be safe, or just use dynamic import?
    // Let's rely on the top-level import I will add.

    // Wait, I can't add top level import in this block easily if it's far away.
    // I will write the function to accept `db` as dependency or use `import('../lib/db.js')`.
    // Let's use dynamic import for safety in this refactor step.

    // Initialize summary
    const summary = {
        eventId,
        total: 0,
        queuedCount: 0,
        failedCount: 0,
        errors: []
    };

    try {
        const recipients = await db.eventParticipation.findMany({
            where: {
                eventId: parseInt(eventId),
                certificateStatus: 'generated',
                emailStatus: { in: ['pending', 'failed'] }
            },
            include: { participant: true }
        });

        summary.total = recipients.length;
        console.log(`   Found ${summary.total} participants to email.`);

        const DELAY_MS = 1500; // 1.5s delay
        const outputDir = path.join(ROOT_DIR, 'uploads/certificates');

        for (let i = 0; i < recipients.length; i++) {
            const p = recipients[i];

            // Check if certificate exists
            const certPath = path.join(outputDir, p.certificatePath);
            if (!fs.existsSync(certPath)) {
                const errMsg = `Certificate missing: ${certPath}`;
                console.error(`   ❌ ${errMsg}`);
                await db.eventParticipation.update({
                    where: { id: p.id },
                    data: { emailStatus: 'failed', emailError: 'Certificate file missing' }
                });
                summary.failedCount++;
                summary.errors.push({ email: p.participant.email, error: 'Certificate file missing' });
                continue;
            }

            // Send Email
            try {
                // Metadata for email template
                const metadata = {
                    eventName: p.customEventData ? JSON.parse(p.customEventData).eventName : 'Event',
                    eventDate: p.customEventData ? JSON.parse(p.customEventData).eventDate : null,
                    organizationName: p.customEventData ? JSON.parse(p.customEventData).organizationName : null
                };

                const result = await sendEmailWithRetry(p.participant, certPath, metadata);

                if (result.success) {
                    await db.eventParticipation.update({
                        where: { id: p.id },
                        data: {
                            emailStatus: 'sent',
                            emailSentAt: new Date(),
                            emailRetries: result.attempts
                        }
                    });
                    summary.queuedCount++;
                } else {
                    await db.eventParticipation.update({
                        where: { id: p.id },
                        data: {
                            emailStatus: 'failed',
                            emailError: result.error,
                            emailRetries: result.attempts
                        }
                    });
                    summary.failedCount++;
                    summary.errors.push({ email: p.participant.email, error: result.error });
                }

            } catch (err) {
                console.error(`   ❌ Critical error sending to ${p.participant.email}:`, err);
                await db.eventParticipation.update({
                    where: { id: p.id },
                    data: { emailStatus: 'failed', emailError: err.message }
                });
                summary.failedCount++;
                summary.errors.push({ email: p.participant.email, error: err.message });
            }

            // Throttling Delay
            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        console.log(`✅ [Email Queue] Finished processing for Event ${eventId}. Sent: ${summary.queuedCount}, Failed: ${summary.failedCount}`);
        return summary;

    } catch (error) {
        console.error(`❌ [Email Queue] Failed to queue emails for Event ${eventId}:`, error);
        summary.error = error.message;
        return summary;
    }
};

