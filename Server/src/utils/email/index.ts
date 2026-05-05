/**
 * Email & Status Utilities - Main Export
 * Centralized module for email sending, audit logging and event handling
 */

// Types
export type { EmailTask, EmailTemplate, EmailTemplates, AuditLogTask } from '../types/status-events';
export { ReceiptStatus, type ReceiptStatusType } from '../types/status-events';

// Email Service
export {
    generateEmailTemplate,
    sendStatusUpdateEmail,
    callEmailProcedure,
    validateEmailTask,
    formatEmailLog
} from './email-service';

// Email Queue
export {
    emailQueue,
    queueEmail,
    queueEmailBatch,
    getEmailQueueStats,
    getEmailQueueStatus
} from './email-queue';

// Status Emitter
export {
    setupStatusEventHandlers,
    emitEmail
} from './status-emitter';

// Audit Log Service
export {
    validateAuditLogTask,
    saveAuditLogAsync,
    formatAuditLogMessage
} from './audit-log-service';

// Audit Log Queue
export {
    auditLogQueue,
    queueAuditLog,
    queueAuditLogBatch,
    getAuditLogQueueStats,
    getAuditLogQueueStatus
} from './audit-log-queue';

// Audit Log Emitter
export {
    setupAuditLogEventHandlers,
    emitAuditLog
} from './audit-log-emitter';
