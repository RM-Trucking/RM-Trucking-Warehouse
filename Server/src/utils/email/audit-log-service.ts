/**
 * Audit Log Service Utility
 * Centralized audit logging with database integration
 */

import { db } from '../../config/db2';
import { AuditLogTask } from '../types/status-events';
import * as warehouseReceiptDB from '../../database/warehouse-receipt';

/**
 * Validate audit log task
 */
export function validateAuditLogTask(task: AuditLogTask): boolean {
    if (!task) {
        console.warn('⚠️ Invalid audit log task: null or undefined');
        return false;
    }

    // Accept both number and bigint types
    const isValidReceiptNumber = task.receiptNumber && (typeof task.receiptNumber === 'number' || typeof task.receiptNumber === 'bigint');
    if (!isValidReceiptNumber) {
        console.warn('⚠️ Invalid audit log task: missing or invalid receiptNumber');
        return false;
    }

    // Accept both number and bigint types
    const isValidReceiptId = task.receiptId && (typeof task.receiptId === 'number' || typeof task.receiptId === 'bigint');
    if (!isValidReceiptId) {
        console.warn('⚠️ Invalid audit log task: missing or invalid receiptId');
        return false;
    }

    if (typeof task.userId !== 'number') {
        console.warn('⚠️ Invalid audit log task: missing userId');
        return false;
    }

    if (!task.status || typeof task.status !== 'string') {
        console.warn('⚠️ Invalid audit log task: missing status');
        return false;
    }

    return true;
}

/**
 * Format audit log for logging
 */
export function formatAuditLogMessage(task: AuditLogTask): string {
    return `Receipt #${task.receiptNumber} | Status: ${task.status} | User: ${task.userId} | ${task.proNumber ? `PRO: ${task.proNumber}` : ''
        }`;
}

/**
 * Save audit log to database
 * Low-level function that executes the audit log creation
 */
export async function saveAuditLogAsync(task: AuditLogTask): Promise<number> {
    try {
        const connection = await db();

        // Convert BigInt to number if needed
        const receiptNumber = typeof task.receiptNumber === 'bigint' ? Number(task.receiptNumber) : task.receiptNumber;
        const receiptId = typeof task.receiptId === 'bigint' ? Number(task.receiptId) : task.receiptId;

        const auditLogData = {
            receiptNumber,
            receiptId,
            proNumber: task.proNumber || undefined,
            level: task.level || 'INFO',
            userId: task.userId,
            status: task.status,
            description: task.description || `Audit log for receipt #${receiptNumber}`
        };

        console.info(
            `📝 Saving audit log: ${formatAuditLogMessage(task)}`
        );

        const auditLogId = await warehouseReceiptDB.createAuditLog(connection, auditLogData);

        console.info(
            `✅ Audit log saved successfully. ID: ${auditLogId} - ${formatAuditLogMessage(task)}`
        );

        return auditLogId;
    } catch (error) {
        console.error('❌ Audit log save failed:', {
            task,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
