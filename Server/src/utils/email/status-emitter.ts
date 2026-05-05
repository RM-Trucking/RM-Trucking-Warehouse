/**
 * Status Event Emitter
 * Centralized event-driven system for email notifications
 * 
 * SIMPLIFIED: Audit logs are saved directly in service layer.
 * This module now focuses on email queue management.
 */

import { EventEmitter } from 'events';
import { queueEmail } from './email-queue';
import { EmailTask } from '../types/status-events';

/**
 * Custom Status Event Emitter
 */
class StatusEventEmitter extends EventEmitter {
    /**
     * Remove all listeners
     */
    clear(): void {
        this.removeAllListeners();
        console.log('✅ Event emitter cleared');
    }
}

// Global status event emitter instance
const statusEmitter = new StatusEventEmitter();

/**
 * Setup event handlers
 * Registers email queue listener
 * Called once during app initialization
 */
export function setupStatusEventHandlers(): void {
    // Email event listener
    statusEmitter.on('email', (emailTask: EmailTask) => {
        try {
            if (emailTask) {
                queueEmail(emailTask);
            }
        } catch (error) {
            console.error('❌ Error in email event handler:', error);
        }
    });

    console.log('✅ Status event handlers registered');
}

/**
 * Emit email-only event
 * Queues email notification
 *
 * @example
 * emitEmail({
 *   receiptNumber: 123,
 *   to: 'customer@example.com',
 *   status: 'INITIATED'
 * });
 */
export function emitEmail(emailTask: EmailTask): void {
    try {
        if (!emailTask || !emailTask.to) {
            console.warn('⚠️ Invalid email task');
            return;
        }

        console.log(`📧 Emitting email event: Receipt #${emailTask.receiptNumber} to ${emailTask.to}`);
        statusEmitter.emit('email', emailTask);
    } catch (error) {
        console.error('❌ Error emitting email event:', error);
    }
}

export default statusEmitter;
