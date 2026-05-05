/**
 * Audit Log Queue Handler
 * Manages asynchronous audit log persistence using async.queue
 */

import async, { AsyncQueue } from 'async';
import { AuditLogTask } from '../types/status-events';
import { saveAuditLogAsync, validateAuditLogTask, formatAuditLogMessage } from './audit-log-service';

// Queue configuration
const DEFAULT_CONCURRENCY = 1; // Save audit logs sequentially to maintain order
const QUEUE_TIMEOUT = 30000; // 30 seconds timeout per audit log

interface QueueTask extends AuditLogTask { }

/**
 * Create and configure audit log queue
 * Returns queue instance and management functions
 */
function createAuditLogQueue(concurrency: number = DEFAULT_CONCURRENCY) {
    let successCount = 0;
    let failureCount = 0;

    const queue = async.queue(
        async (task: QueueTask, done: (err?: Error | null) => void) => {
            try {
                // Validate task
                if (!validateAuditLogTask(task)) {
                    throw new Error('Invalid audit log task');
                }

                console.log(`📤 Processing audit log: ${formatAuditLogMessage(task)}`);

                // Save audit log
                await saveAuditLogAsync(task);

                successCount++;
                console.log(
                    `✅ Audit log saved successfully. Pending: ${queue.length()}, Success: ${successCount}, Failed: ${failureCount}`
                );
                // done();
            } catch (error) {
                // console.log(error)
                failureCount++;
                const errorMsg =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `❌ Audit log failed: ${formatAuditLogMessage(task)} | Error: ${errorMsg}`
                );
                // done(error instanceof Error ? error : new Error(String(error)));
            }
        },
        concurrency
    );

    // Handle drain (queue empty)
    queue.drain(() => {
        console.log(
            `✅ Audit log queue drained. Total - Success: ${successCount}, Failed: ${failureCount}`
        );
    });

    // Handle error
    queue.error((error: Error, task: QueueTask) => {
        console.error(
            `🚨 Queue error for ${formatAuditLogMessage(task)}: ${error.message}`
        );
    });

    return {
        queue,
        push: (task: AuditLogTask) => queue.push(task),
        addBatch: (tasks: AuditLogTask[]) => queue.push(tasks),
        getStats: () => ({
            pending: queue.length(),
            running: queue.running(),
            success: successCount,
            failed: failureCount,
            total: successCount + failureCount
        }),
        pause: () => queue.pause(),
        resume: () => queue.resume(),
        clear: () => {
            const remaining = queue.length();
            if (remaining > 0) {
                console.warn(`🗑️  Clearing ${remaining} pending audit logs from queue`);
            }
        }
    };
}

// Initialize global audit log queue
export const auditLogQueue = createAuditLogQueue(DEFAULT_CONCURRENCY);

/**
 * Add single audit log task to queue
 */
export function queueAuditLog(task: AuditLogTask): void {
    if (!validateAuditLogTask(task)) {
        console.error('❌ Invalid audit log task:', task);
        return;
    }
    auditLogQueue.push(task);
}

/**
 * Add multiple audit log tasks to queue
 */
export function queueAuditLogBatch(tasks: AuditLogTask[]): void {
    if (!tasks || tasks.length === 0) {
        console.warn('⚠️ No audit log tasks to queue');
        return;
    }
    const validTasks = tasks.filter(task => validateAuditLogTask(task));
    if (validTasks.length > 0) {
        auditLogQueue.addBatch(validTasks);
        console.log(`📝 Queued ${validTasks.length} audit log task(s)`);
    }
}

/**
 * Get audit log queue statistics
 */
export function getAuditLogQueueStats() {
    return auditLogQueue.getStats();
}

/**
 * Get audit log queue status as formatted string
 */
export function getAuditLogQueueStatus(): string {
    const stats = auditLogQueue.getStats();
    return `Audit Log Queue - Pending: ${stats.pending}, Running: ${stats.running}, Success: ${stats.success}, Failed: ${stats.failed}`;
}
