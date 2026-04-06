import { Connection } from "odbc";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import { WarehouseReceipt, FreightInfo, AuditLog, WarehouseReceiptRate } from "../../entities/warehouse-receipt";

/**
 * GET WAREHOUSE RECEIPT WITH ALL DETAILS
 * - Fetches receipt, freight info, rates, and audit logs
 */
export async function getWarehouseReceiptWithDetailsService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!receipt) return null;

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
    const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId);
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receiptId);

    return {
        ...receipt,
        freightInfos,
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

    // If status changed, create audit log automatically
    if (updates.status && updates.status !== currentReceipt.status) {
        await warehouseReceiptDB.createAuditLog(conn, {
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
    return { freightId };
}

/**
 * UPDATE FREIGHT INFO
 */
export async function updateFreightInfoService(conn: Connection, freightId: number, updates: any) {
    await warehouseReceiptDB.updateFreightInfo(conn, freightId, updates);
}

/**
 * ADD AUDIT LOG
 */
export async function addAuditLogService(conn: Connection, logData: Omit<AuditLog, "auditLogId" | "eventTime">) {
    const auditLogId = await warehouseReceiptDB.createAuditLog(conn, logData);
    return { auditLogId };
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
        createdAt: receipt.createdAt,
        createdBy: receipt.createdBy
    };
}
