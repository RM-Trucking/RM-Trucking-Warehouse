/**
 * Audit Log Event Emitter
 * Centralized event-driven system for audit log persistence
 */

import { EventEmitter } from 'events';
import { queueAuditLog } from './audit-log-queue';
import { AuditLogTask } from '../types/status-events';

/**
 * Custom Audit Log Event Emitter
 */
class AuditLogEventEmitter extends EventEmitter {
    /**
     * Remove all listeners
     */
    clear(): void {
        this.removeAllListeners();
        console.log('✅ Audit log event emitter cleared');
    }
}

// Global audit log event emitter instance
const auditLogEmitter = new AuditLogEventEmitter();

/**
 * Setup event handlers for audit logs
 * Registers audit log queue listener
 * Called once during app initialization
 */
export function setupAuditLogEventHandlers(): void {
    // Audit log event listener
    auditLogEmitter.on('auditLog', (auditLogTask: AuditLogTask) => {
        try {
            if (auditLogTask) {
                queueAuditLog(auditLogTask);
            }
        } catch (error) {
            console.error('❌ Error in audit log event handler:', error);
        }
    });

    console.log('✅ Audit log event handlers registered');
}

/**
 * Emit audit log event
 * Queues audit log for persistence
 *
 * @example
 * emitAuditLog({
 *   receiptNumber: 123,
 *   receiptId: 456,
 *   userId: 789,
 *   status: 'INITIATED',
 *   proNumber: 'PRO-123',
 *   level: 'INFO',
 *   description: 'Receipt created'
 * });
 */
export function emitAuditLog(auditLogTask: AuditLogTask): void {
    try {
        if (!auditLogTask || !auditLogTask.receiptNumber || !auditLogTask.receiptId) {
            console.warn('⚠️ Invalid audit log task');
            return;
        }

        console.log(
            `📝 Emitting audit log event: Receipt #${auditLogTask.receiptNumber} | Status: ${auditLogTask.status}`
        );
        auditLogEmitter.emit('auditLog', auditLogTask);
    } catch (error) {
        console.error('❌ Error emitting audit log event:', error);
    }
}

export default auditLogEmitter;
