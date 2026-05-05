/**
 * Status and Email Event Types
 * Centralized types for audit logs and email templates
 */

import { AuditLog, CreateAuditLog } from '../../entities/warehouse-receipt';

// Status enumeration
export enum ReceiptStatus {
    INITIATED = 'INITIATED',
    LOADED = 'LOADED',
    SHIPPED = 'SHIPPED',
    DISCARDED = 'DISCARDED',
    REJECTED = 'REJECTED',
    ACCEPTED = 'ACCEPTED'
}

export type ReceiptStatusType = 'INITIATED' | 'LOADED' | 'SHIPPED' | 'DISCARDED' | 'REJECTED' | 'ACCEPTED';

// Audit log task interface
export interface AuditLogTask {
    receiptNumber: number | bigint;
    receiptId: number | bigint;
    proNumber?: string;
    level?: string;
    userId: number;
    status: string;
    description?: string;
}

// Email task interface
export interface EmailTask {
    to: string;
    receiptNumber: number | bigint;
    status?: ReceiptStatusType | null;
    subject?: string;
    body?: string;
    message?: string;
    hasAttachment?: boolean;
    attachmentPath?: string;
}

// Status event payload
export interface StatusEventPayload {
    auditLog?: Omit<CreateAuditLog, 'receiptId'> | null;
    emailTask?: EmailTask | null;
    userId: number;
    description?: string;
}

// Email status templates
export interface EmailTemplate {
    subject: (receiptNumber: number) => string;
    body: (receiptNumber: number, message?: string) => string;
}

export type EmailTemplates = Record<ReceiptStatusType, EmailTemplate>;
