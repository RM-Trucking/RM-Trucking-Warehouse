import { config } from 'dotenv';
config();

import { Connection } from 'odbc';
import { DB2, initializeDB2Pool, closeDB2Pool, db } from '../config/db2';
import {
    createWarehouseReceiptRate,
    getEligibleWarehouseReceiptInvoiceRows,
    getWarehouseReceiptRate,
    updateWarehouseReceipt,
    updateWarehouseReceiptRate,
} from '../database/warehouse-receipt';
import { getWarehouseReceiptByIdOrReceiptNumberService } from '../services/warehouse-receipt';
import { createWarehouseReceiptPDF } from './warehouseReceiptPDFHandler';
import { generateEDIForWarehouseReceipt } from './warehouseReceiptEDIHandler';

export interface WarehouseReceiptInvoiceBatchOptions {
    limit?: number;
    pdfOutputDirectory?: string;
    ediOutputDirectory?: string;
    includeReceiptIds?: number[];
    excludeReceiptIds?: number[];
}

export interface WarehouseReceiptInvoiceBatchResult {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    receipts: WarehouseReceiptInvoiceBatchReceiptResult[];
}

export interface WarehouseReceiptInvoiceBatchReceiptResult {
    receiptId: number | null;
    receiptNumber: number | null;
    status: 'processed' | 'failed' | 'skipped';
    pdfPath?: string;
    ediPath?: string;
    errors: string[];
}

const DEFAULT_PDF_OUTPUT = process.env.RECEIPT_PDF_OUTPUT || 'uploads/warehouse-receipt-invoices';
const DEFAULT_EDI_OUTPUT = process.env.RECEIPT_EDI_OUTPUT || 'uploads/warehouse-receipt-invoice-edi';

function isValidRate(rate: any): rate is { finalRate: number; minRate?: number; maxRate?: number } {
    if (!rate || typeof rate !== 'object') {
        return false;
    }

    const finalRate = Number(rate.finalRate ?? rate.rate);
    if (!Number.isFinite(finalRate) || finalRate < 0) {
        return false;
    }

    const minRate = Number(rate.minRate);
    const maxRate = Number(rate.maxRate);

    if (Number.isFinite(minRate) && finalRate < minRate) {
        return false;
    }

    if (Number.isFinite(maxRate) && finalRate > maxRate) {
        return false;
    }

    return true;
}

function normalizeReceiptId(value: number | bigint | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeReceiptNumber(value: number | bigint | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function getPathOutputDirectory(explicitPath?: string, defaultPath?: string): string {
    return explicitPath || defaultPath || process.cwd();
}

async function findEligibleReceipts(conn: Connection, options: WarehouseReceiptInvoiceBatchOptions) {
    return getEligibleWarehouseReceiptInvoiceRows(conn, {
        limit: options.limit,
        includeReceiptIds: options.includeReceiptIds,
        excludeReceiptIds: options.excludeReceiptIds,
    });
}

async function storeRateInformation(
    conn: Connection,
    receiptId: number,
    rateInformation: { finalRate: number; minRate?: number; maxRate?: number; baseRate?: number; dimFactor?: number }
): Promise<void> {
    const incomingRate = {
        rate: Number(rateInformation.finalRate),
        dimFactor: Number(rateInformation.dimFactor ?? 0),
        baseRate: Number(rateInformation.baseRate ?? 0),
        minRate: Number(rateInformation.minRate ?? 0),
        maxRate: Number(rateInformation.maxRate ?? 0),
    };
    const existingRate = await getWarehouseReceiptRate(conn, receiptId);

    if (!existingRate) {
        await createWarehouseReceiptRate(conn, { receiptId, ...incomingRate });
        return;
    }

    const isUnchanged =
        Number(existingRate.finalRate) === incomingRate.rate &&
        Number(existingRate.dimFactor) === incomingRate.dimFactor &&
        Number(existingRate.baseRate) === incomingRate.baseRate &&
        Number(existingRate.minRate) === incomingRate.minRate &&
        Number(existingRate.maxRate) === incomingRate.maxRate;

    if (!isUnchanged) {
        await updateWarehouseReceiptRate(conn, receiptId, incomingRate);
    }
}

async function processWarehouseReceiptInvoice(
    conn: Connection,
    receipt: any,
    pdfOutputDirectory: string,
    ediOutputDirectory: string
): Promise<WarehouseReceiptInvoiceBatchReceiptResult> {
    const receiptId = normalizeReceiptId(receipt?.receiptId);
    const receiptNumber = normalizeReceiptNumber(receipt?.receiptNumber);
    const result: WarehouseReceiptInvoiceBatchReceiptResult = {
        receiptId,
        receiptNumber,
        status: 'processed',
        errors: [],
    };

    try {
        const rateInformation = receipt?.rateInformation;

        if (!rateInformation) {
            throw new Error('Missing rate information');
        }

        if (!isValidRate(rateInformation)) {
            throw new Error('Rate is invalid');
        }

        const pdfPath = await createWarehouseReceiptPDF({
            ...receipt,
            rateInformation,
        }, true, pdfOutputDirectory);
        result.pdfPath = pdfPath;

        const ediSuccess = await generateEDIForWarehouseReceipt(
            {
                ...receipt,
                rateInformation,
            },
            ediOutputDirectory
        );

        if (!ediSuccess) {
            throw new Error('EDI generation failed');
        }

        if (receiptId === null) {
            throw new Error('Receipt ID is required to store rate information');
        }

        await storeRateInformation(conn, receiptId, rateInformation);
        // await updateWarehouseReceipt(conn, receiptId, { sendToTellSystem: 'Y' });

        const ediFilename = `${receiptNumber ?? receiptId ?? 'receipt'}.txt`;
        result.ediPath = `${ediOutputDirectory}/${ediFilename}`;
    } catch (error: any) {
        result.status = 'failed';
        result.errors.push(error?.message || 'Receipt processing failed');
        console.error(`[Warehouse Receipt Invoice] Receipt ${receiptNumber ?? receiptId} failed:`, error);
    }

    return result;
}

export async function processWarehouseReceiptInvoiceBatch(
    conn: Connection,
    options: WarehouseReceiptInvoiceBatchOptions = {}
): Promise<WarehouseReceiptInvoiceBatchResult> {
    const pdfOutputDirectory = getPathOutputDirectory(options.pdfOutputDirectory, DEFAULT_PDF_OUTPUT);
    const ediOutputDirectory = getPathOutputDirectory(options.ediOutputDirectory, DEFAULT_EDI_OUTPUT);
    const eligibleReceipts = await findEligibleReceipts(conn, options);

    console.log(`[Warehouse Receipt Invoice] Found ${eligibleReceipts.length} eligible receipts for processing.`);

    const receipts: WarehouseReceiptInvoiceBatchReceiptResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const receiptRow of eligibleReceipts) {
        const receiptId = normalizeReceiptId(receiptRow.receiptId);

        try {
            const receipt = await getWarehouseReceiptByIdOrReceiptNumberService(conn, receiptId as number, 'receiptId');

            if (!receipt) {
                throw new Error('Receipt no longer exists');
            }

            if (!receipt.rateInformation || !isValidRate(receipt.rateInformation)) {
                throw new Error('Missing or invalid rate information');
            }

            const result = await processWarehouseReceiptInvoice(
                conn,
                receipt,
                pdfOutputDirectory,
                ediOutputDirectory
            );

            if (result.status === 'failed') {
                failed += 1;
            } else {
                succeeded += 1;
            }

            receipts.push(result);
        } catch (error: any) {
            failed += 1;
            receipts.push({
                receiptId,
                receiptNumber: normalizeReceiptNumber(receiptRow.receiptNumber),
                status: 'failed',
                errors: [error?.message || 'Receipt processing failed'],
            });
            console.error(`[Warehouse Receipt Invoice] Receipt ${receiptRow.receiptNumber ?? receiptId} could not be processed:`, error);
        }
    }

    const summary: WarehouseReceiptInvoiceBatchResult = {
        processed: eligibleReceipts.length,
        succeeded,
        failed,
        skipped: 0,
        receipts,
    };

    console.log(`[Warehouse Receipt Invoice] Batch completed: ${summary.processed} processed, ${summary.succeeded} succeeded, ${summary.failed} failed.`);
    return summary;
}

export async function runWarehouseReceiptInvoiceBatch(
    options: WarehouseReceiptInvoiceBatchOptions = {}
): Promise<WarehouseReceiptInvoiceBatchResult> {
    const conn = await db();

    try {
        return await processWarehouseReceiptInvoiceBatch(conn, options);
    } finally {
        console.log('[Warehouse Receipt Invoice] Batch process finished.');
    }
}

if (require.main === module) {
    initializeDB2Pool()
        .then(() => runWarehouseReceiptInvoiceBatch())
        .catch((error) => {
            console.error('[Warehouse Receipt Invoice] Batch initialization failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await closeDB2Pool().catch((error) => {
                console.error('[Warehouse Receipt Invoice] Failed to close DB2 pool:', error);
            });
        });
}
