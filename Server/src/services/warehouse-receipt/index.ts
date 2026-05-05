import { Connection } from "odbc";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import { emitAuditLog } from "../../utils/email";
import { WarehouseReceipt, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptTemp } from "../../entities/warehouse-receipt";

/**
 * GET WAREHOUSE RECEIPT WITH ALL DETAILS
 * - Fetches receipt, freight info with images, rates, and audit logs
 */
export async function getWarehouseReceiptWithDetailsService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptByReceiptNumber(conn, receiptId);
    if (!receipt) return null;

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

    // Fetch images for each freight
    const freightWithImages = await Promise.all(
        freightInfos.map(async (freight) => ({
            ...freight,
            images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
        }))
    );

    const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId);
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receiptId);

    return {
        ...receipt,
        freightInfos: freightWithImages,
        rate,
        auditLogs
    };
}

/**
 * GET WAREHOUSE RECEIPT BY PRO NUMBER WITH ALL DETAILS
 * - Fetches receipt by PRO number, including freight info with images, rates, and audit logs
 */
export async function getWarehouseReceiptByProService(conn: Connection, proNumber: string) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptByProNumber(conn, proNumber);
    if (!receipt) return null;

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);

    // Fetch images for each freight
    const freightWithImages = await Promise.all(
        freightInfos.map(async (freight) => ({
            ...freight,
            images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
        }))
    );

    const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receipt.receiptId);
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receipt.receiptId);

    return {
        ...receipt,
        freightInfos: freightWithImages,
        rate,
        auditLogs
    };
}

/**
 * LIST WAREHOUSE RECEIPTS WITH PAGINATION & FILTERING
 */
export async function listWarehouseReceiptsService(
    conn: Connection,
    page: number = 1,
    pageSize: number = 10,
    filters?: { status?: string; carrierId?: number }
) {
    const offset = (page - 1) * pageSize;
    const data = await warehouseReceiptDB.listWarehouseReceipts(conn, pageSize, offset, filters);
    return { data, page, pageSize };
}

/**
 * GET RECEIPTS BY VERIFICATION ID
 */
export async function getReceiptsByVerificationService(conn: Connection, verificationId: number) {
    return await warehouseReceiptDB.getWarehouseReceiptsByVerification(conn, verificationId);
}

/**
 * GET RECEIPTS BY CUSTOMER & STATION
 */
export async function getReceiptsByCustomerStationService(conn: Connection, customerId: number, stationId: number) {
    return await warehouseReceiptDB.getWarehouseReceiptsByCustomerStation(conn, customerId, stationId);
}

/**
 * UPDATE WAREHOUSE RECEIPT
 * - If status is updated, automatically create an audit log for the status change
 */
export async function updateWarehouseReceiptService(
    conn: Connection,
    receiptId: number,
    updates: Partial<Omit<WarehouseReceipt, 'receiptId' | 'createdAt' | 'createdBy'>>
) {
    // Get current receipt before update
    const currentReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!currentReceipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    // Update receipt
    await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, updates);

    // If status changed, emit audit log automatically (centralized handling)
    if (updates.status && updates.status !== currentReceipt.status) {
        emitAuditLog({
            receiptNumber: currentReceipt.receiptNumber,
            receiptId,
            proNumber: currentReceipt.proNumber || undefined,
            userId: updates.updatedBy || currentReceipt.createdBy,
            status: updates.status,
            description: `Status changed from ${currentReceipt.status} to ${updates.status}`,
            level: "INFO"
        });
    }

    return await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
}

/**
 * ADD FREIGHT INFO TO RECEIPT
 */
export async function addFreightInfoService(conn: Connection, freightData: Omit<FreightInfo, "freightId">) {
    const freightId = await warehouseReceiptDB.createFreightInfo(conn, freightData);

    // Handle images if provided
    const images = (freightData as any).images || [];
    if (Array.isArray(images)) {
        for (const imagePath of images) {
            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
        }
    }

    return { freightId };
}

/**
 * UPDATE FREIGHT INFO
 */
export async function updateFreightInfoService(conn: Connection, freightId: number, updates: any) {
    const { images, ...updateData } = updates;

    // Update freight info
    await warehouseReceiptDB.updateFreightInfo(conn, freightId, updateData);

    // Handle images if provided
    if (Array.isArray(images)) {
        // Delete existing images
        await warehouseReceiptDB.deleteFreightImagesByFreight(conn, freightId);

        // Create new images
        for (const imagePath of images) {
            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
        }
    }
}

/**
 * GET FREIGHT INFO WITH IMAGES
 */
export async function getFreightInfoWithImagesService(conn: Connection, freightId: number) {
    const freight = await warehouseReceiptDB.getFreightInfoById(conn, freightId);
    if (!freight) return null;

    const images = await warehouseReceiptDB.getFreightImages(conn, freightId);
    return {
        ...freight,
        images
    };
}

/**
 * ADD AUDIT LOG
 * Emits audit log event for asynchronous centralized processing
 */
export async function addAuditLogService(conn: Connection, logData: Omit<AuditLog, "auditLogId" | "eventTime">) {
    emitAuditLog({
        receiptNumber: logData.receiptNumber,
        receiptId: logData.receiptId,
        proNumber: logData.proNumber,
        userId: logData.userId,
        status: logData.status,
        description: logData.description,
        level: logData.level
    });
    return { message: 'Audit log queued for processing' };
}

/**
 * ADD RATE TO RECEIPT
 */
export async function addWarehouseReceiptRateService(conn: Connection, rateData: Omit<WarehouseReceiptRate, "rateId">) {
    const rateId = await warehouseReceiptDB.createWarehouseReceiptRate(conn, rateData);
    return { rateId };
}

/**
 * UPDATE RECEIPT RATE
 */
export async function updateWarehouseReceiptRateService(conn: Connection, rateId: number, updates: any) {
    await warehouseReceiptDB.updateWarehouseReceiptRate(conn, rateId, updates);
}

/**
 * GET RECEIPT SUMMARY (STATUS, COUNTS, TOTALS)
 */
export async function getReceiptSummaryService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!receipt) return null;

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
    const totalPieces = freightInfos.reduce((sum, f) => sum + f.pieces, 0);
    const totalWeight = freightInfos.reduce((sum, f) => sum + (f.weight || 0), 0);

    // Count total images across all freight items
    let totalImages = 0;
    for (const freight of freightInfos) {
        const images = await warehouseReceiptDB.getFreightImages(conn, freight.freightId);
        totalImages += images.length;
    }

    return {
        receiptNumber: receipt.receiptNumber,
        proNumber: receipt.proNumber,
        status: receipt.status,
        customerId: receipt.customerId,
        stationId: receipt.stationId,
        carrierId: receipt.carrierId,
        totalPieces,
        totalWeight,
        freightCount: freightInfos.length,
        totalImages,
        createdAt: receipt.createdAt,
        createdBy: receipt.createdBy
    };
}

/**
 * CREATE TEMPORARY WAREHOUSE RECEIPT
 * - Creates temp receipt and returns all data
 */
/**
 * CREATE TEMPORARY WAREHOUSE RECEIPT
 * - Creates temp receipt and returns all data
 * - createdBy comes from authenticated user
 */
export async function createTemporaryWarehouseReceiptService(conn: Connection, tempData: Omit<WarehouseReceiptTemp, "receiptNumber">, userId: number) {
    const dataWithUser = {
        ...tempData,
        receiptDate: new Date(),
        createdBy: userId
    };
    const receiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn, dataWithUser);
    const tempReceipt = await warehouseReceiptDB.getWarehouseReceiptTempByNumber(conn, receiptNumber);
    return tempReceipt;
}

/**
 * CREATE WAREHOUSE RECEIPT WITH FREIGHT INFO
 * - Creates receipt, adds all freight info, and returns receipt with freight details
 * - createdBy comes from authenticated user
 */
export async function createWarehouseReceiptWithFreightService(
    conn: Connection,
    receiptData: any,
    freightDetails: any[],
    userId: number
) {
    await conn.beginTransaction();
    try {
        // Add createdBy from authenticated user
        const dataWithUser = {
            ...receiptData,
            createdBy: userId
        };

        // Create warehouse receipt
        const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, dataWithUser);

        // Create document
        const documentId = await warehouseReceiptDB.createWarehouseReceiptDocument(conn, receiptId);

        // Update receipt with documentId
        await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, { documentId });

        // Create freight info records
        const freightIds: number[] = [];
        for (const freight of freightDetails) {
            const { images, ...freightData } = freight;

            const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                ...freightData,
                receiptId
            });
            freightIds.push(freightId);

            // Create associated images if provided
            if (Array.isArray(images)) {
                for (const imagePath of images) {
                    await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                }
            }
        }

        await conn.commit();

        // Get complete receipt with all details
        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

        // Fetch images for each freight
        const freightWithImages = await Promise.all(
            freightInfos.map(async (freight) => ({
                ...freight,
                images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
            }))
        );

        return {
            ...receipt,
            freightInfos: freightWithImages
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

/**
 * BATCH PROCESS WAREHOUSE RECEIPTS
 * - Updates reference receipt with provided updates
 * - Creates multiple new warehouse receipts with freight info
 * - Returns updated reference receipt and all newly created receipts
 */
export async function batchProcessWarehouseReceiptsService(
    conn: Connection,
    receipts: any[],
    userId: number
) {
    await conn.beginTransaction();
    try {
        const updatedReceipts = [];
        const createdReceipts = [];

        // Process each receipt in the array
        for (const item of receipts) {
            const { receipt, freightDetails } = item;

            if (!receipt || !Array.isArray(freightDetails)) {
                throw new Error("Each item must have receipt object and freightDetails array");
            }

            // Check if this is an update (receipt has receiptId) or create (doesn't have receiptId)
            if (receipt.receiptId) {
                // UPDATE operation
                const receiptId = receipt.receiptId;

                // Get all existing receipt data
                const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                if (!existingReceipt) {
                    throw new Error(`Receipt with ID ${receiptId} not found`);
                }

                // System fields that should NOT be updated
                const systemFields = ['receiptId', 'receiptNumber', 'createdAt', 'createdBy', 'documentId', 'entityId', 'noteThreadId', 'receiptDate'];

                // Extract only updateable fields from provided receipt
                const updateData: any = {};
                Object.keys(receipt).forEach(key => {
                    if (!systemFields.includes(key)) {
                        updateData[key] = receipt[key];
                    }
                });

                // Set updatedBy to current user
                updateData.updatedBy = userId;

                // Update the receipt with filtered data
                await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, updateData);

                console.log(`Updated receipt ID ${receiptId} with data:`, updateData);

                // Delete existing freight details and create new ones
                await warehouseReceiptDB.deleteFreightInfoByReceipt(conn, receiptId);

                console.log(`Deleted existing freight info for receipt ID ${receiptId}`);

                // Create new freight details with images
                for (const freight of freightDetails) {
                    const { images, ...freightData } = freight;

                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId
                    });

                    console.log(`Created freight info ID ${freightId} for receipt ID ${receiptId} with data:`, freightData);

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        console.log(`Creating freight images for freight ID ${freightId}:`, images);
                        for (const imagePath of images) {
                            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                        }
                    }

                    console.log(`Completed freight info ID ${freightId} for receipt ID ${receiptId}`);
                }

                // Get updated receipt with all details
                const updatedReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                const updatedFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const updatedFreightWithImages = await Promise.all(
                    updatedFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                updatedReceipts.push({
                    ...updatedReceipt,
                    freightInfos: updatedFreightWithImages
                });
            } else {

                console.log("Creating new receipt with data:", receipt);
                const entityId = await entityDB.createWarehouseEntity(conn, 'WAREHOUSE_RECEIPT', receipt.receiptNumber.toString());
                const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

                // Add createdBy from authenticated user
                const dataWithUser = {
                    ...receipt,
                    receiptDate: new Date(),
                    createdBy: userId,
                    entityId,
                    noteThreadId
                };

                // Create warehouse receipt
                const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, dataWithUser);

                console.log(`Created new receipt ID ${receiptId} with data:`, dataWithUser);

                // Create freight info records with images
                for (const freight of freightDetails) {
                    const { images, ...freightData } = freight;
                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId
                    });

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        for (const imagePath of images) {
                            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                        }
                    }
                }

                // Get complete receipt with all details
                const createdReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                const createdFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const createdFreightWithImages = await Promise.all(
                    createdFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                createdReceipts.push({
                    ...createdReceipt,
                    freightInfos: createdFreightWithImages
                });
            }
        }

        await conn.commit();

        return {
            updated: updatedReceipts,
            created: createdReceipts,
            totalUpdated: updatedReceipts.length,
            totalCreated: createdReceipts.length
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}
