/**
 * Email Queue Handler
 * Manages asynchronous email sending using async.queue
 */

import async from 'async';
import { EmailTask, ReceiptStatusType } from '../types/status-events';
import { sendStatusUpdateEmail, validateEmailTask, formatEmailLog } from './email-service';

// Queue configuration
const DEFAULT_CONCURRENCY = 1; // Send emails sequentially to avoid rate limits
const QUEUE_TIMEOUT = 30000; // 30 seconds timeout per email

interface QueueTask extends EmailTask { }

/**
 * Create and configure email queue
 * Returns queue instance and management functions
 */
function createEmailQueue(concurrency: number = DEFAULT_CONCURRENCY) {
    let successCount = 0;
    let failureCount = 0;

    const queue = async.queue(
        async (task: QueueTask, done: (err?: Error | null) => void) => {
            try {
                // Validate task
                if (!validateEmailTask(task)) {
                    throw new Error('Invalid email task');
                }

                console.log(`📤 Processing email: ${formatEmailLog(task)}`);

                // Send email
                await sendStatusUpdateEmail(task);

                successCount++;
                console.log(
                    `✅ Email sent successfully. Pending: ${queue.length()}, Success: ${successCount}, Failed: ${failureCount}`
                );
                // done();
            } catch (error) {
                // console.log(error);
                failureCount++;
                const errorMsg =
                    error instanceof Error ? error.message : String(error);
                console.error(
                    `❌ Email failed: ${formatEmailLog(task)} | Error: ${errorMsg}`
                );
                // done(error instanceof Error ? error : new Error(String(error)));
            }
        },
        concurrency
    );

    // Handle drain (queue empty)
    queue.drain(() => {
        console.log(
            `✅ Email queue drained. Total - Success: ${successCount}, Failed: ${failureCount}`
        );
    });

    // Handle error
    queue.error((error: Error, task: QueueTask) => {
        console.error(
            `🚨 Queue error for ${formatEmailLog(task)}: ${error.message}`
        );
    });

    return {
        queue,
        push: (task: EmailTask) => queue.push(task),
        addBatch: (tasks: EmailTask[]) => queue.push(tasks),
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
            // Clear remaining tasks from queue
            const remaining = queue.length();
            if (remaining > 0) {
                console.warn(`🗑️  Clearing ${remaining} pending emails from queue`);
            }
        }
    };
}

// Initialize global email queue
export const emailQueue = createEmailQueue(DEFAULT_CONCURRENCY);

/**
 * Add single email task to queue
 */
export function queueEmail(task: EmailTask): void {
    if (!validateEmailTask(task)) {
        console.error('❌ Invalid email task:', task);
        return;
    }
    emailQueue.push(task);
    console.debug(`📬 Email queued for receipt #${task.receiptNumber}`);
}

/**
 * Add batch of emails to queue
 */
export function queueEmailBatch(tasks: EmailTask[]): void {
    const validTasks = tasks.filter(task => {
        if (!validateEmailTask(task)) {
            console.warn('⚠️  Skipping invalid email task:', task);
            return false;
        }
        return true;
    });

    if (validTasks.length === 0) {
        console.warn('⚠️  No valid email tasks to queue');
        return;
    }

    emailQueue.addBatch(validTasks);
    console.log(`📬 Queued ${validTasks.length} emails`);
}

/**
 * Get queue statistics
 */
export function getEmailQueueStats() {
    return emailQueue.getStats();
}

/**
 * Get queue status summary
 */
export function getEmailQueueStatus(): string {
    const stats = emailQueue.getStats();
    return `Email Queue - Pending: ${stats.pending}, Running: ${stats.running}, Success: ${stats.success}, Failed: ${stats.failed}`;
}

export default emailQueue;
