import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const getEmailTemplate = (participant) => {
    const templatePath = path.join(__dirname, '../templates/emailTemplate.html');
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace variables
    template = template.replace(/{{name}}/g, participant.name);
    template = template.replace(/{{event}}/g, participant.event);
    template = template.replace(/{{organization}}/g, participant.college);

    return template;
};

export const sendEmail = async (participant, attachmentPath) => {
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

        const html = getEmailTemplate(participant);

        const attachments = [
            {
                filename: `Certificate_${participant.certificate_id}.pdf`,
                path: attachmentPath,
            }
        ];

        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            attachments.push({
                filename: 'logo.png',
                path: logoPath,
                cid: 'orgLogo'
            });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: participant.email,
            subject: `Certificate for ${participant.event}`,
            html: html,
            attachments: attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${participant.email}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${participant.email}:`);
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Error Message: ${error.message}`);
        if (error.response) console.error(`   SMTP Response: ${error.response}`);
        return { success: false, error: error.message };
    }
};

// Batch sending logic
export const sendBulkEmails = async (participants, certificatePaths, updateStatusCallback) => {
    const results = { sent: 0, failed: 0, errors: [] };
    const BATCH_SIZE = 5; // Small batch size for safety
    const DELAY_MS = 2000; // 2 seconds delay between batches

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
        const batch = participants.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i / BATCH_SIZE + 1} of size ${batch.length}`);

        const promises = batch.map(async (p) => {
            const certPath = certificatePaths[p.certificate_id];
            if (!certPath) {
                console.error(`❌ No certificate path found for participant ${p.certificate_id}`);
                return { success: false, error: 'Certificate not found' };
            }
            return await sendEmail(p, certPath);
        });

        const batchResults = await Promise.all(promises);

        batchResults.forEach(res => {
            if (res.success) results.sent++;
            else {
                results.failed++;
                results.errors.push(res.error);
            }
        });

        if (updateStatusCallback) {
            updateStatusCallback(results);
        }

        // Wait before next batch if not last
        if (i + BATCH_SIZE < participants.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    return results;
};
