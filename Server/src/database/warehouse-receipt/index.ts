import { Connection } from "odbc";
import { WarehouseReceipt, WarehouseReceiptTemp, FreightInfo, AuditLog, WarehouseReceiptRate } from "../../entities/warehouse-receipt";
import { SCHEMA } from "../../config/db2";

/**
 * WAREHOUSE RECEIPT TEMP
 */
export async function createWarehouseReceiptTemp(conn: Connection, temp: Omit<WarehouseReceiptTemp, "receiptNumber" | "createdAt" | "receivedBy" | "location">): Promise<number> {
    const query = `
        SELECT "receiptNumber"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Temp"
            ("verificationId","receiptDate","shipper",
            "customerId","stationId","carrierId","createdAt","createdBy","status")
            VALUES (?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?,?)
        )`;

    const params: (string | number)[] = [
        Number(temp.verificationId),
        (temp.receiptDate instanceof Date) ? temp.receiptDate.toISOString() : temp.receiptDate,
        temp.shipper ? temp.shipper as string | number : '',
        Number(temp.customerId),
        Number(temp.stationId),
        Number(temp.carrierId),
        Number(temp.createdBy),
        temp.status as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].receiptNumber;
}

export async function getWarehouseReceiptTempByNumber(conn: Connection, receiptNumber: number): Promise<WarehouseReceiptTemp | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Temp" WHERE "receiptNumber" = ?`;
    const result = await conn.query(query, [Number(receiptNumber)]) as any[];
    return result[0] || null;
}

/**
 * WAREHOUSE RECEIPT
 */
export async function createWarehouseReceipt(conn: Connection, receipt: Omit<WarehouseReceipt, "receiptId" | "receivedBy" | "location">): Promise<number> {

    console.log("Creating Warehouse Receipt with data:", receipt);

    const query = `
        SELECT "receiptId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt"
            ("receiptNumber","receiptDate","labelCount","shipper",
            "customerId","stationId","verificationId","createdAt","createdBy","carrierId",
            "piecesInland","weightInland","proNumber","status","entityId","noteThreadId")
            VALUES (?,?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?,?,?,?,?,?,?,?)
        )`;

    const params: (string | number)[] = [
        Number(receipt.receiptNumber),
        (receipt.receiptDate instanceof Date) ? receipt.receiptDate.toISOString() : receipt.receiptDate,
        (receipt.labelCount || 0) as number,
        (receipt.shipper || '') as string | number,
        Number(receipt.customerId),
        Number(receipt.stationId),
        Number(receipt.verificationId),
        Number(receipt.createdBy),
        Number(receipt.carrierId),
        (receipt.piecesInland || 0) as number,
        (receipt.weightInland || 0) as number,
        (receipt.proNumber || '') as string | number,
        receipt.status as string | number,
        receipt.entityId as string | number,
        receipt.noteThreadId as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return Number(result[0].receiptId);
}

export async function getWarehouseReceiptById(conn: Connection, receiptId: number): Promise<WarehouseReceipt | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt" WHERE "receiptId" = ?`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];
    return result[0] || null;
}

export async function getWarehouseReceiptsByVerification(
    conn: Connection,
    verificationId: number
): Promise<WarehouseReceipt[]> {
    const query = `
        SELECT * 
        FROM ${SCHEMA}."Warehouse_Receipt" 
        WHERE "verificationId" = ? 
        ORDER BY "receiptNumber" DESC
    `;
    const result = await conn.query(query, [Number(verificationId)]) as any[];

    // Transform each row to ensure BigInt fields are serializable
    return result.map((row: any) => ({
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
    }));
}

export async function getWarehouseReceiptsByCustomerStation(conn: Connection, customerId: number, stationId: number): Promise<WarehouseReceipt[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt" WHERE "customerId" = ? AND "stationId" = ? ORDER BY "receiptNumber" DESC`;
    return await conn.query(query, [customerId, stationId]) as WarehouseReceipt[];
}

export async function listWarehouseReceipts(conn: Connection, limit: number, offset: number, filters?: { status?: string; carrierId?: number }): Promise<WarehouseReceipt[]> {
    let query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt" WHERE 1=1`;
    const params: (string | number)[] = [];

    if (filters?.status) {
        query += ` AND "status" = ?`;
        params.push(filters.status);
    }
    if (filters?.carrierId) {
        query += ` AND "carrierId" = ?`;
        params.push(filters.carrierId);
    }

    query += ` ORDER BY "receiptNumber" DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await conn.query(query, params) as WarehouseReceipt[];
}

export async function updateWarehouseReceipt(conn: Connection, receiptId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (updates.location !== undefined) {
        fields.push(`"location" = ?`);
        params.push(updates.location);
    }
    if (updates.labelCount !== undefined) {
        fields.push(`"labelCount" = ?`);
        params.push(updates.labelCount);
    }
    if (updates.piecesInland !== undefined) {
        fields.push(`"piecesInland" = ?`);
        params.push(updates.piecesInland);
    }
    if (updates.weightInland !== undefined) {
        fields.push(`"weightInland" = ?`);
        params.push(updates.weightInland);
    }
    if (updates.reWeight !== undefined) {
        fields.push(`"reWeight" = ?`);
        params.push(updates.reWeight);
    }
    if (updates.status !== undefined) {
        fields.push(`"status" = ?`);
        params.push(updates.status);
    }
    if (updates.updatedBy !== undefined) {
        fields.push(`"updatedBy" = ?`);
        params.push(updates.updatedBy);
    }
    if (updates.documentId !== undefined) {
        fields.push(`"documentId" = ?`);
        params.push(updates.documentId);
    }

    if (fields.length === 0) return;

    fields.push(`"updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)`);
    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET ${fields.join(', ')} WHERE "receiptId" = ?`;
    params.push(Number(receiptId));

    await conn.query(query, params);
}

/**
 * Validation: check duplicate carrier + PRO number
 */
export async function checkDuplicateCarrierPro(conn: Connection, carrierId: number, proNumber: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${SCHEMA}."Warehouse_Receipt" WHERE "carrierId" = ? AND "proNumber" = ?`;
    const result = await conn.query(query, [carrierId, proNumber]) as any[];
    return result[0].count > 0;
}

/**
 * FREIGHT INFO QUERIES
 */
export async function createFreightInfo(conn: Connection, freight: Omit<FreightInfo, "freightId">): Promise<number> {
    const query = `
    INSERT INTO ${SCHEMA}."Warehouse_Receipt_Freight_Info"
      ("receiptId","pieces","type","length","width","height","weight","imageId")
    VALUES (?,?,?,?,?,?,?,?)
    RETURNING "freightId"
  `;
    const params: (string | number)[] = [
        Number(freight.receiptId),
        freight.pieces,
        freight.type,
        (freight.length || '') as string | number,
        (freight.width || '') as string | number,
        (freight.height || '') as string | number,
        (freight.weight || '') as string | number,
        (freight.imageId ? Number(freight.imageId) : '') as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].freightId;
}

export async function getFreightInfosByReceipt(conn: Connection, receiptId: number): Promise<FreightInfo[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" WHERE "receiptId" = ?`;
    return await conn.query(query, [Number(receiptId)]) as FreightInfo[];
}

export async function updateFreightInfo(conn: Connection, freightId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (updates.pieces !== undefined) {
        fields.push(`"pieces" = ?`);
        params.push(updates.pieces);
    }
    if (updates.length !== undefined) {
        fields.push(`"length" = ?`);
        params.push(updates.length);
    }
    if (updates.width !== undefined) {
        fields.push(`"width" = ?`);
        params.push(updates.width);
    }
    if (updates.height !== undefined) {
        fields.push(`"height" = ?`);
        params.push(updates.height);
    }
    if (updates.weight !== undefined) {
        fields.push(`"weight" = ?`);
        params.push(updates.weight);
    }

    if (fields.length === 0) return;

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt_Freight_Info" SET ${fields.join(', ')} WHERE "freightId" = ?`;
    params.push(Number(freightId));

    await conn.query(query, params);
}

/**
 * AUDIT LOG QUERIES
 */
export async function createAuditLog(conn: Connection, log: Omit<AuditLog, "auditLogId" | "eventTime">): Promise<number> {
    const query = `
        SELECT "auditLogId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Audit_Log"
            ("receiptNumber","receiptId","proNumber","level","eventTime","userId","status","description")
            VALUES (?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?,?,?)
        )`;

    const params: (string | number)[] = [
        Number(log.receiptNumber),
        Number(log.receiptId),
        (log.proNumber || '') as string | number,
        (log.level || '') as string | number,
        log.userId,
        log.status,
        (log.description || '') as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].auditLogId;
}

export async function getAuditLogsByReceipt(conn: Connection, receiptId: number): Promise<AuditLog[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Audit_Log" WHERE "receiptId" = ? ORDER BY "eventTime" DESC`;
    return await conn.query(query, [Number(receiptId)]) as AuditLog[];
}

/**
 * WAREHOUSE RECEIPT RATE QUERIES
 */
export async function createWarehouseReceiptRate(conn: Connection, rateData: Omit<WarehouseReceiptRate, "rateId">): Promise<number> {
    const query = `
    INSERT INTO ${SCHEMA}."Warehouse_Receipt_Rate"
      ("receiptId","rate","dimFactor","baseRate","minRate","maxRate")
    VALUES (?,?,?,?,?,?)
    RETURNING "rateId"
  `;
    const params: (string | number)[] = [
        Number(rateData.receiptId),
        rateData.rate,
        (rateData.dimFactor || '') as string | number,
        (rateData.baseRate || '') as string | number,
        (rateData.minRate || '') as string | number,
        (rateData.maxRate || '') as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].rateId;
}

export async function getWarehouseReceiptRate(conn: Connection, receiptId: number): Promise<WarehouseReceiptRate | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Rate" WHERE "receiptId" = ?`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];
    return result[0] || null;
}

export async function updateWarehouseReceiptRate(conn: Connection, rateId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (updates.rate !== undefined) {
        fields.push(`"rate" = ?`);
        params.push(updates.rate);
    }
    if (updates.dimFactor !== undefined) {
        fields.push(`"dimFactor" = ?`);
        params.push(updates.dimFactor);
    }
    if (updates.baseRate !== undefined) {
        fields.push(`"baseRate" = ?`);
        params.push(updates.baseRate);
    }
    if (updates.minRate !== undefined) {
        fields.push(`"minRate" = ?`);
        params.push(updates.minRate);
    }
    if (updates.maxRate !== undefined) {
        fields.push(`"maxRate" = ?`);
        params.push(updates.maxRate);
    }

    if (fields.length === 0) return;

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt_Rate" SET ${fields.join(', ')} WHERE "rateId" = ?`;
    params.push(Number(rateId));

    await conn.query(query, params);
}

/**
 * WAREHOUSE RECEIPT DOCUMENTS
 */
export async function createWarehouseReceiptDocument(
    conn: Connection,
    receiptId: number,
): Promise<number> {
    const query = `
    SELECT "documentId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Warehouse_Receipt_Documents"
        ("receiptId")
      VALUES (?)
    )
  `;

    const result = await conn.query(query, [receiptId]) as any[];
    return Number(result[0].documentId);
}


export async function getWarehouseReceiptDocument(
    conn: Connection,
    documentId: number
): Promise<any> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "documentId" = ?`;
    const result = await conn.query(query, [documentId]) as any[];
    return result[0] || null;
}

export async function getDocumentsByReceiptNumber(
    conn: Connection,
    receiptNumber: number
): Promise<any[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "receiptNumber" = ? ORDER BY "createdAt" DESC`;
    return await conn.query(query, [receiptNumber]) as any[];
}
