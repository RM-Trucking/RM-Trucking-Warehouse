import * as chokidar from 'chokidar';
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { db } from '../config/db2';
import { getWarehouseReceiptByReceiptNumber } from '../database/warehouse-receipt';
import { updateWarehouseReceiptInvoiceNumberService } from '../services/warehouse-receipt';

const activeFiles = new Set<string>();
let watcher: chokidar.FSWatcher | null = null;

interface ReceiptInvoiceTransaction {
    segments: string[];
    terminated: boolean;
}

interface ReceiptInvoiceData {
    receiptNumber: string;
    invoiceNumber: string;
}

function parseTransactions(content: string): ReceiptInvoiceTransaction[] {
    const transactions: ReceiptInvoiceTransaction[] = [];
    let currentSegments: string[] | null = null;

    for (const rawSegment of content.split('~')) {
        const segment = rawSegment.trim();
        if (!segment) {
            continue;
        }

        const segmentId = segment.split('*', 1)[0].trim();
        if (segmentId === 'ST') {
            if (currentSegments) {
                transactions.push({ segments: currentSegments, terminated: false });
            }
            currentSegments = [segment];
        } else if (currentSegments) {
            currentSegments.push(segment);
            if (segmentId === 'SE') {
                transactions.push({ segments: currentSegments, terminated: true });
                currentSegments = null;
            }
        }
    }

    if (currentSegments) {
        transactions.push({ segments: currentSegments, terminated: false });
    }

    return transactions;
}

function extractTransactionData(transaction: ReceiptInvoiceTransaction): ReceiptInvoiceData | null {
    if (!transaction.terminated) {
        return null;
    }

    const segments = transaction.segments.map((segment) => segment.split('*').map((field) => field.trim()));
    const b1 = segments.find((fields) => fields[0] === 'B1');
    const n9Segments = segments.filter((fields) => fields[0] === 'N9');
    const n9 = n9Segments.find((fields) => fields[1] === 'CN') || n9Segments[0];
    const receiptNumber = b1?.[2];
    const invoiceNumber = n9?.[2];

    if (!receiptNumber || !/^\d+$/.test(receiptNumber) || !invoiceNumber) {
        return null;
    }

    return { receiptNumber, invoiceNumber };
}

async function moveFile(sourcePath: string, destinationDirectory: string): Promise<string> {
    const fileName = path.basename(sourcePath);
    let destinationPath = path.join(destinationDirectory, fileName);
    try {
        await rename(sourcePath, destinationPath);
    } catch (error: any) {
        if (error.code === 'EXDEV') {
            try {
                await copyFile(sourcePath, destinationPath);
            } catch (copyError: any) {
                if (copyError.code !== 'EEXIST') {
                    throw copyError;
                }
                destinationPath = path.join(destinationDirectory, `${Date.now()}-${fileName}`);
                await copyFile(sourcePath, destinationPath);
            }
            await unlink(sourcePath);
            return destinationPath;
        }

        if (error.code !== 'EEXIST') {
            throw error;
        }
        destinationPath = path.join(destinationDirectory, `${Date.now()}-${fileName}`);
        await rename(sourcePath, destinationPath);
    }
    return destinationPath;
}

async function processFile(filePath: string, processedDirectory: string, errorDirectory: string): Promise<void> {
    const normalizedPath = path.resolve(filePath);
    if (activeFiles.has(normalizedPath)) {
        return;
    }

    activeFiles.add(normalizedPath);
    let processingSucceeded = false;
    let connection: Awaited<ReturnType<typeof db>> | null = null;
    const errorDetails: string[] = [];

    console.log(`[Receipt Invoice Response] File detected: ${normalizedPath}`);
    console.log(`[Receipt Invoice Response] Processing started: ${normalizedPath}`);

    try {
        const content = await readFile(normalizedPath, 'utf8');
        const transactions = parseTransactions(content);
        if (transactions.length === 0) {
            const message = 'No ST/SE transaction blocks were found.';
            errorDetails.push(message);
            console.error(`[Receipt Invoice Response] Invalid transaction data: ${message} File: ${normalizedPath}`);
            return;
        }

        connection = await db();
        processingSucceeded = true;

        for (const [index, transaction] of transactions.entries()) {
            const parsed = extractTransactionData(transaction);
            if (!parsed) {
                processingSucceeded = false;
                const message = `Transaction ${index + 1}: missing or invalid B1 element 2 receipt number or N9 element 2 invoice number.`;
                errorDetails.push(message);
                console.error(`[Receipt Invoice Response] Invalid transaction data: ${message} File: ${normalizedPath}`);
                continue;
            }

            console.log(`[Receipt Invoice Response] Receipt number extracted: ${parsed.receiptNumber}`);
            console.log(`[Receipt Invoice Response] Invoice number extracted: ${parsed.invoiceNumber}`);

            try {
                const receipt = await getWarehouseReceiptByReceiptNumber(connection, Number(parsed.receiptNumber));
                if (!receipt) {
                    throw new Error(`Warehouse receipt ${parsed.receiptNumber} was not found`);
                }

                const updatedReceipt = await updateWarehouseReceiptInvoiceNumberService(
                    connection,
                    Number(receipt.receiptId),
                    parsed.invoiceNumber
                );
                if (!updatedReceipt) {
                    throw new Error(`Warehouse receipt ${parsed.receiptNumber} could not be updated`);
                }

                console.log(`[Receipt Invoice Response] Warehouse receipt updated successfully: ${parsed.receiptNumber}`);
            } catch (error) {
                processingSucceeded = false;
                const reason = error instanceof Error ? error.message : String(error);
                errorDetails.push(`Transaction ${index + 1} (receipt ${parsed.receiptNumber}, invoice ${parsed.invoiceNumber}): update failed: ${reason}`);
                console.error(`[Receipt Invoice Response] Update failed for receipt ${parsed.receiptNumber}:`, error);
            }
        }
    } catch (error) {
        processingSucceeded = false;
        const reason = error instanceof Error ? error.message : String(error);
        errorDetails.push(`File processing failed: ${reason}`);
        console.error(`[Receipt Invoice Response] Update failed while processing ${normalizedPath}:`, error);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                processingSucceeded = false;
                const reason = error instanceof Error ? error.message : String(error);
                errorDetails.push(`Database connection close failed: ${reason}`);
                console.error(`[Receipt Invoice Response] Update failed while closing DB connection for ${normalizedPath}:`, error);
            }
        }

        try {
            const destinationPath = await moveFile(normalizedPath, processingSucceeded ? processedDirectory : errorDirectory);
            if (!processingSucceeded && errorDetails.length > 0) {
                await writeFile(`${destinationPath}.error.txt`, `${errorDetails.join('\n')}\n`, 'utf8');
            }
        } catch (error) {
            console.error(`[Receipt Invoice Response] Failed to move ${normalizedPath}:`, error);
        }

        console.log(`[Receipt Invoice Response] Processing completed: ${normalizedPath}`);
        activeFiles.delete(normalizedPath);
    }
}

export async function initializeReceiptInvoiceResponseWatcher(): Promise<void> {
    const incomingPath = process.env.RECEIPT_INVOICE_RESPONSE;
    if (!incomingPath) {
        throw new Error('RECEIPT_INVOICE_RESPONSE is not configured');
    }

    const incomingDirectory = path.resolve(incomingPath);
    const processedDirectory = path.resolve(
        process.env.RECEIPT_INVOICE_PROCESSED || path.join(incomingDirectory, 'Processed')
    );
    const errorDirectory = path.resolve(
        process.env.RECEIPT_INVOICE_ERROR || path.join(incomingDirectory, 'Error')
    );

    await Promise.all([
        mkdir(incomingDirectory, { recursive: true }),
        mkdir(processedDirectory, { recursive: true }),
        mkdir(errorDirectory, { recursive: true }),
    ]);

    watcher = chokidar.watch(incomingDirectory, {
        persistent: true,
        ignoreInitial: false,
        depth: 0,
        awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
    });

    watcher.on('add', (filePath: string) => {
        void processFile(filePath, processedDirectory, errorDirectory);
    });
    watcher.on('error', (error: unknown) => {
        console.error(
            '[Receipt Invoice Response] File watcher error:',
            error instanceof Error ? error.message : String(error)
        );
    });
    watcher.on('ready', () => {
        console.log(`[Receipt Invoice Response] Watching folder: ${incomingDirectory}`);
    });
}

export async function closeReceiptInvoiceResponseWatcher(): Promise<void> {
    if (watcher) {
        await watcher.close();
        watcher = null;
    }
}