/**
 * Email Service Utility
 * Centralized email sending with database procedure integration
 */

import { db } from '../../config/db2';
import { SCHEMA } from '../../config/db2';
import { EmailTask, EmailTemplates, ReceiptStatusType } from '../types/status-events';

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'CFSAIREXPORT@RMTRUCKING.COM';

// Email status templates - can be customized per status
const EMAIL_TEMPLATES: EmailTemplates = {
    INITIATED: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} Initiated`,
        body: (receiptNumber: number) =>
            `Dear Customer,\n\nYour Warehouse Receipt #${receiptNumber} has been initiated and is now in our system. We'll notify you as it progresses.\n\nThank you for choosing us.`
    },
    ON_HAND: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} - On Hand`,
        body: (receiptNumber: number) =>
            `Dear Customer,\n\nYour Warehouse Receipt #${receiptNumber} is now ON-HAND and ready for the next step. We appreciate your business.`
    },
    SHIPPED: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} - Shipped`,
        body: (receiptNumber: number) =>
            `Dear Customer,\n\nGreat news! Your Warehouse Receipt #${receiptNumber} has been shipped. You'll receive tracking details soon.`
    },
    DISCARDED: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} - Archived`,
        body: (receiptNumber: number) =>
            `Dear Customer,\n\nYour Warehouse Receipt #${receiptNumber} has been archived. If you have any questions, feel free to reach out.`
    },
    REJECTED: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} - Rejected`,
        body: (receiptNumber: number, message?: string) =>
            message || `Dear Customer,\n\nUnfortunately, your Warehouse Receipt #${receiptNumber} was rejected. Please contact support for more details.`
    },
    ACCEPTED: {
        subject: (receiptNumber: number) => `Warehouse Receipt #${receiptNumber} - Accepted`,
        body: (receiptNumber: number) =>
            `Dear Customer,\n\nYour Warehouse Receipt #${receiptNumber} has been accepted. Thank you for your business.`
    }
};

/**
 * Generate email template based on status
 * Supports custom overrides
 */
export function generateEmailTemplate(
    receiptNumber: number | bigint,
    status?: ReceiptStatusType,
    message?: string,
    subjectOverride?: string,
    bodyOverride?: string
): { subject: string; body: string } {
    // Convert BigInt to number if needed
    const numReceiptNumber = typeof receiptNumber === 'bigint' ? Number(receiptNumber) : receiptNumber;

    // If overrides provided, use them
    if (subjectOverride && bodyOverride) {
        return { subject: subjectOverride, body: bodyOverride };
    }

    if (subjectOverride && status) {
        const template = EMAIL_TEMPLATES[status];
        return {
            subject: subjectOverride,
            body: template.body(numReceiptNumber, message)
        };
    }

    // Use template based on status
    if (status && EMAIL_TEMPLATES[status]) {
        const template = EMAIL_TEMPLATES[status];
        return {
            subject: template.subject(numReceiptNumber),
            body: template.body(numReceiptNumber, message)
        };
    }

    // Default template
    return {
        subject: `Warehouse Receipt #${numReceiptNumber} Update`,
        body: `Dear Customer,\n\nYour Warehouse Receipt #${numReceiptNumber} has been updated.\n\nThank you.`
    };
}

/**
 * Call database email procedure
 * Low-level function that executes the email stored procedure
 */
export async function callEmailProcedure(
    to: string,
    subject: string,
    body: string,
    attachmentPath?: string
): Promise<any> {
    try {
        const connection = await db();
        const from = FROM_EMAIL;
        const params = [
            from,
            to,
            subject,
            body,
            attachmentPath || ' ',
            ' ' // Additional parameter if needed
        ];

        console.info(`📧 Sending email: from=${from}, to=${to}, subject="${subject}"`);

        const result = await connection.callProcedure(null, SCHEMA, 'SNDMULMAIL', params);

        console.info('✅ Email sent successfully:', { to, subject });
        return result;
    } catch (error) {
        console.error('❌ Email delivery failed:', {
            to,
            subject,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

/**
 * Send status update email
 * High-level function with full support for custom templates
 */
export async function sendStatusUpdateEmail(
    task: EmailTask,
    // Optional overrides for custom email content
    emailOverrides?: {
        subject?: string;
        body?: string;
    }
): Promise<any> {
    try {
        const recipient = task.to;

        // Validate email recipient is provided
        if (!recipient) {
            console.warn(`⚠️  No email recipient provided for receipt #${task.receiptNumber}`);
            return null;
        }

        // Validate email format
        if (!isValidEmail(recipient)) {
            console.error(`❌ Invalid email format: ${recipient}`);
            throw new Error(`Invalid email format: ${recipient}`);
        }

        // Convert BigInt to number if needed
        const receiptNumber = typeof task.receiptNumber === 'bigint' ? Number(task.receiptNumber) : task.receiptNumber;

        // Generate email template
        const { subject, body } = generateEmailTemplate(
            receiptNumber,
            task.status || undefined,
            task.message,
            emailOverrides?.subject || task.subject,
            emailOverrides?.body || task.body
        );

        // Check attachment
        if (task.hasAttachment && !task.attachmentPath) {
            console.warn(
                `⚠️  Attachment requested for receipt #${task.receiptNumber} but no path provided`
            );
            return null;
        }

        // Send email via procedure
        return await callEmailProcedure(recipient, subject, body, task.attachmentPath);
    } catch (error) {
        console.error('❌ Failed to send status update email:', error);
        throw error;
    }
}

/**
 * Simple email validator
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate email task
 */
export function validateEmailTask(task: Partial<EmailTask>): task is EmailTask {
    if (!task.receiptNumber || task.receiptNumber <= 0) {
        console.error('❌ Invalid recipient: receiptNumber is required');
        return false;
    }
    return true;
}

/**
 * Format email for logging
 */
export function formatEmailLog(task: EmailTask): string {
    return `[Receipt #${task.receiptNumber}] To: ${task.to}, Status: ${task.status}, HasAttachment: ${task.hasAttachment}`;
}
