import { Connection } from "odbc";
import { WarehouseReceipt, WarehouseReceiptTemp, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptFreightImage, WarehouseReceiptDocuments } from "../../entities/warehouse-receipt";
import { SCHEMA } from "../../config/db2";

/**
 * WAREHOUSE RECEIPT TEMP
 */
export async function createWarehouseReceiptTemp(conn: Connection, temp: Omit<WarehouseReceiptTemp, "receiptNumber" | "createdAt">): Promise<number> {
    const query = `
        SELECT "receiptNumber"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Temp"
            ("verificationId","receiptDate","shipper",
            "customerId","stationId","carrierId","createdAt","createdBy","status", "destination", "proNumber", "packageId", "location", "receivedBy")
            VALUES (?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?,?, ?, ?, ?, ?, ?)
        )`;

    const params: (string | number)[] = [
        Number(temp.verificationId),
        (temp.receiptDate instanceof Date) ? temp.receiptDate.toISOString() : temp.receiptDate,
        temp.shipper as string | number,
        Number(temp.customerId),
        Number(temp.stationId),
        Number(temp.carrierId),
        Number(temp.createdBy),
        temp.status as string | number,
        temp.destination ? temp.destination : '' as string | number,
        temp.proNumber as string | number,
        temp.packageId ? temp.packageId : '' as string | number,
        temp.location ? temp.location : '' as string | number,
        temp.receivedBy ? temp.receivedBy : '' as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return parseInt(result[0].receiptNumber);
}

export async function getWarehouseReceiptTempByNumber(conn: Connection, receiptNumber: number): Promise<WarehouseReceiptTemp | null> {
    const query = `
    SELECT w.*, c."carrierName", cu."customerName", s."stationName"
    FROM ${SCHEMA}."Warehouse_Receipt_Temp" w
    LEFT JOIN ${SCHEMA}."Carrier" c ON w."carrierId" = c."carrierId"
    LEFT JOIN ${SCHEMA}."Customer" cu ON w."customerId" = cu."customerId"
    LEFT JOIN ${SCHEMA}."Station" s ON w."stationId" = s."stationId"
    WHERE w."receiptNumber" = ?`;
    const result = await conn.query(query, [Number(receiptNumber)]) as any[];

    if (!result || result.length === 0) {
        return null;
    }

    return {
        ...result[0],
        receiptNumber: result[0].receiptNumber != null ? parseInt(result[0].receiptNumber) : null,
        verificationId: result[0].verificationId != null ? parseInt(result[0].verificationId) : null,
        customerName: result[0].customerName ?? null,
        stationName: result[0].stationName ?? null,
        carrierName: result[0].carrierName ?? null,
    };
}

/**
 * WAREHOUSE RECEIPT
 */
export async function createWarehouseReceipt(
    conn: Connection,
    receipt: Omit<WarehouseReceipt, "receiptId" | "receivedBy" | "location">
): Promise<number> {
    const query = `
        SELECT "receiptId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt"
            (
                "receiptNumber",
                "receiptDate",
                "labelCount",
                "shipper",
                "customerId",
                "stationId",
                "verificationId",
                "createdAt",
                "createdBy",
                "carrierId",
                "piecesInland",
                "weightInland",
                "proNumber",
                "status",
                "entityId",
                "noteThreadId",
                "invoiceNumber",
                "poNumber",
                "customerRefNumber",
                "destination",
                "packageId",
                "withSkid",
                "bandedSkid",
                "shrinkWrappedSkid",
                "shtIppcSkid",
                "plasticSkid",
                "freightCondition",
                "handlingDescription",
                "hazMat",
                "originalDgd",
                "unNumber",
                "class",
                "properShippingName",
                "hazardousDescription",
                "toEmails",
                "cubicMeter"
            )
            VALUES (?,?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        )
    `;

    const params: (string | number | null)[] = [
        receipt.receiptNumber != null ? Number(receipt.receiptNumber) : null,
        (receipt.receiptDate instanceof Date) ? receipt.receiptDate.toISOString() : receipt.receiptDate,
        receipt.labelCount ?? 0,
        receipt.shipper ?? '',
        receipt.customerId != null ? Number(receipt.customerId) : null,
        receipt.stationId != null ? Number(receipt.stationId) : null,
        receipt.verificationId != null ? Number(receipt.verificationId) : null,
        receipt.createdBy != null ? Number(receipt.createdBy) : null,
        receipt.carrierId != null ? Number(receipt.carrierId) : null,
        receipt.piecesInland != null ? Number(receipt.piecesInland) : null,
        receipt.weightInland != null ? Number(receipt.weightInland) : null,
        receipt.proNumber ?? '',
        receipt.status ?? '',
        receipt.entityId != null ? Number(receipt.entityId) : null,
        receipt.noteThreadId != null ? Number(receipt.noteThreadId) : null,
        receipt.invoiceNumber ?? '',
        receipt.poNumber ?? '',
        receipt.customerRefNumber ?? '',
        receipt.destination ?? '',
        receipt.packageId ?? '',
        receipt.withSkid === 'Y' ? 'Y' : 'N',
        receipt.bandedSkid === 'Y' ? 'Y' : 'N',
        receipt.shrinkWrappedSkid === 'Y' ? 'Y' : 'N',
        receipt.shtIppcSkid === 'Y' ? 'Y' : 'N',
        receipt.plasticSkid === 'Y' ? 'Y' : 'N',
        receipt.freightCondition === 'Y' ? 'Y' : 'N',
        receipt.handlingDescription ?? null,
        receipt.hazMat === 'Y' ? 'Y' : 'N',
        receipt.originalDgd === 'Y' ? 'Y' : 'N',
        Array.isArray(receipt.unNumber) ? JSON.stringify(receipt.unNumber) : receipt.unNumber ?? null,
        Array.isArray(receipt.class) ? JSON.stringify(receipt.class) : receipt.class ?? null,
        receipt.properShippingName ?? '',
        receipt.hazardousDescription ?? '',
        Array.isArray(receipt.toEmails) ? JSON.stringify(receipt.toEmails) : receipt.toEmails ?? null,
        receipt.cubicMeter !== undefined ? Number(receipt.cubicMeter) : null
    ];

    const result = await conn.query(query, params as any) as any[];
    return result[0]?.receiptId;
}


export async function getWarehouseReceiptById(
    conn: Connection,
    receiptId: number
): Promise<WarehouseReceipt | null> {
    const query = `
        SELECT * 
        FROM ${SCHEMA}."Warehouse_Receipt" 
        WHERE "receiptId" = ?
    `;
    const result = await conn.query(query, [Number(receiptId)]) as any[];

    if (!result || result.length === 0) {
        return null;
    }

    const row = result[0];
    return {
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : null
    };
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
    const result = await conn.query(query, [customerId, stationId]) as WarehouseReceipt[];
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

    const result = await conn.query(query, params) as WarehouseReceipt[];

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

export async function updateWarehouseReceipt(conn: Connection, receiptId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.receivedBy !== undefined) {
        fields.push(`"receivedBy" = ?`);
        params.push(updates.receivedBy ? updates.receivedBy : '' as string);
    }
    if (updates.shipper !== undefined) {
        fields.push(`"shipper" = ?`);
        params.push(updates.shipper ? updates.shipper : '' as string);
    }
    if (updates.customerId !== undefined) {
        fields.push(`"customerId" = ?`);
        params.push(Number(updates.customerId));
    }
    if (updates.stationId !== undefined) {
        fields.push(`"stationId" = ?`);
        params.push(Number(updates.stationId));
    }
    if (updates.verificationId !== undefined) {
        fields.push(`"verificationId" = ?`);
        params.push(Number(updates.verificationId));
    }
    if (updates.carrierId !== undefined) {
        fields.push(`"carrierId" = ?`);
        params.push(Number(updates.carrierId));
    }
    if (updates.proNumber !== undefined) {
        fields.push(`"proNumber" = ?`);
        params.push(updates.proNumber ? updates.proNumber : '' as string);
    }
    if (updates.entityId !== undefined) {
        fields.push(`"entityId" = ?`);
        params.push(Number(updates.entityId));
    }
    if (updates.noteThreadId !== undefined) {
        fields.push(`"noteThreadId" = ?`);
        params.push(Number(updates.noteThreadId));
    }
    if (updates.destination !== undefined) {
        fields.push(`"destination" = ?`);
        params.push(updates.destination ? updates.destination : '' as string);
    }
    if (updates.packageId !== undefined) {
        fields.push(`"packageId" = ?`);
        params.push(updates.packageId ? updates.packageId : '' as string);
    }

    // Additional update fields
    if (updates.location !== undefined) {
        fields.push(`"location" = ?`);
        params.push(updates.location ? updates.location : '' as string);
    }
    if (updates.labelCount !== undefined) {
        fields.push(`"labelCount" = ?`);
        params.push(updates.labelCount !== null && !isNaN(Number(updates.labelCount)) ? Number(updates.labelCount) : null);
    }
    if (updates.piecesInland !== undefined) {
        fields.push(`"piecesInland" = ?`);
        params.push(updates.piecesInland !== null && !isNaN(Number(updates.piecesInland)) ? Number(updates.piecesInland) : null);
    }
    if (updates.weightInland !== undefined) {
        fields.push(`"weightInland" = ?`);
        params.push(updates.weightInland !== null && !isNaN(Number(updates.weightInland)) ? Number(updates.weightInland) : null);
    }

    if (updates.cubicMeter !== undefined) {
        fields.push(`"cubicMeter" = ?`);
        params.push(updates.cubicMeter !== null && !isNaN(Number(updates.cubicMeter)) ? Number(updates.cubicMeter) : null);
    }

    if (updates.reWeight !== undefined) {
        fields.push(`"reWeight" = ?`);
        params.push(updates.reWeight !== null && !isNaN(Number(updates.reWeight)) ? Number(updates.reWeight) : null);
    }
    if (updates.status !== undefined) {
        fields.push(`"status" = ?`);
        params.push(updates.status);
    }
    if (updates.updatedBy !== undefined) {
        fields.push(`"updatedBy" = ?`);
        params.push(Number(updates.updatedBy));
    }
    if (updates.documentId !== undefined) {
        fields.push(`"documentId" = ?`);
        params.push(Number(updates.documentId));
    }

    // Invoice and PO related fields
    if (updates.invoiceNumber !== undefined) {
        fields.push(`"invoiceNumber" = ?`);
        params.push(updates.invoiceNumber ? updates.invoiceNumber : '' as string);
    }
    if (updates.poNumber !== undefined) {
        fields.push(`"poNumber" = ?`);
        params.push(updates.poNumber ? updates.poNumber : '' as string);
    }
    if (updates.customerRefNumber !== undefined) {
        fields.push(`"customerRefNumber" = ?`);
        params.push(updates.customerRefNumber ? updates.customerRefNumber : '' as string);
    }

    // Skid related fields
    if (updates.withSkid !== undefined) {
        fields.push(`"withSkid" = ?`);
        params.push(updates.withSkid == 'Y' ? 'Y' : 'N');
    }
    if (updates.bandedSkid !== undefined) {
        fields.push(`"bandedSkid" = ?`);
        params.push(updates.bandedSkid == 'Y' ? 'Y' : 'N');
    }
    if (updates.shrinkWrappedSkid !== undefined) {
        fields.push(`"shrinkWrappedSkid" = ?`);
        params.push(updates.shrinkWrappedSkid == 'Y' ? 'Y' : 'N');
    }
    if (updates.shtIppcSkid !== undefined) {
        fields.push(`"shtIppcSkid" = ?`);
        params.push(updates.shtIppcSkid == 'Y' ? 'Y' : 'N');
    }
    if (updates.plasticSkid !== undefined) {
        fields.push(`"plasticSkid" = ?`);
        params.push(updates.plasticSkid == 'Y' ? 'Y' : 'N');
    }

    // Freight and handling fields
    if (updates.freightCondition !== undefined) {
        fields.push(`"freightCondition" = ?`);
        params.push(updates.freightCondition == 'Y' ? 'Y' : 'N');
    }
    if (updates.handlingDescription !== undefined) {
        fields.push(`"handlingDescription" = ?`);
        params.push(updates.handlingDescription ? updates.handlingDescription : '' as string);
    }

    // Hazmat fields
    if (updates.hazMat !== undefined) {
        fields.push(`"hazMat" = ?`);
        params.push(updates.hazMat == 'Y' ? 'Y' : 'N');
    }
    if (updates.originalDgd !== undefined) {
        fields.push(`"originalDgd" = ?`);
        params.push(updates.originalDgd == 'Y' ? 'Y' : 'N');
    }
    if (updates.unNumber !== undefined) {
        fields.push(`"unNumber" = ?`);
        params.push(
            Array.isArray(updates.unNumber)
                ? JSON.stringify(updates.unNumber)
                : updates.unNumber || null
        );
    }
    if (updates.class !== undefined) {
        fields.push(`"class" = ?`);
        params.push(
            Array.isArray(updates.class)
                ? JSON.stringify(updates.class)
                : updates.class || null
        );
    }

    if (updates.properShippingName !== undefined) {
        fields.push(`"properShippingName" = ?`);
        params.push(updates.properShippingName ? updates.properShippingName : '' as string);
    }
    if (updates.hazardousDescription !== undefined) {
        fields.push(`"hazardousDescription" = ?`);
        params.push(updates.hazardousDescription ? updates.hazardousDescription : '' as string);
    }

    if (updates.rejectionReason !== undefined) {
        fields.push(`"rejectionReason" = ?`);
        params.push(updates.rejectionReason ? updates.rejectionReason : '' as string);
    }

    if (updates.toEmails !== undefined) {
        fields.push(`"toEmails" = ?`);
        params.push(
            Array.isArray(updates.toEmails)
                ? JSON.stringify(updates.toEmails)
                : updates.toEmails || null
        );
    }

    if (fields.length === 0) return;

    fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET ${fields.join(', ')} WHERE "receiptId" = ?`;
    params.push(Number(receiptId));

    await conn.query(query, params as any[]);
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
        SELECT "freightId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Freight_Info"
            ("receiptId","pieces","type","length","width","height","weight","cubicMeter")
            VALUES (?,?,?,?,?,?,?,?)
        )
        `;

    const params: (string | number)[] = [
        Number(freight.receiptId),
        freight.pieces,
        freight.type,
        (freight.length || '') as string | number,
        (freight.width || '') as string | number,
        (freight.height || '') as string | number,
        (freight.weight || '') as string | number,
        (freight.cubicMeter || '') as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].freightId;
}

export async function getFreightInfosByReceipt(conn: Connection, receiptId: number | bigint): Promise<FreightInfo[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" WHERE "receiptId" = ?`;
    const result = await conn.query(query, [Number(receiptId)]) as FreightInfo[];

    return result.map((row: any) => ({
        ...row,
        freightId: row.freightId != null ? parseInt(row.freightId) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
    }));
}

export async function getFreightInfoById(conn: Connection, freightId: number | bigint): Promise<FreightInfo | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" WHERE "freightId" = ?`;
    const result = await conn.query(query, [Number(freightId)]) as any[];
    return result[0] || null;
}

export async function updateFreightInfo(conn: Connection, freightId: number | bigint, updates: any): Promise<void> {
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

export async function deleteFreightInfo(conn: Connection, freightId: number | bigint): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" WHERE "freightId" = ?`;
    await conn.query(query, [Number(freightId)]);
}

export async function deleteFreightInfoByReceipt(conn: Connection, receiptId: number | bigint): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" WHERE "receiptId" = ?`;
    await conn.query(query, [Number(receiptId)]);
}

/**
 * FREIGHT IMAGES QUERIES
 */
export async function createFreightImage(conn: Connection, freightId: number | bigint, imagePath: string): Promise<number> {
    const query = `
        SELECT "imageId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Freight_Images"
            ("freightId","imagePath","uploadedAt")
            VALUES (?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
        )
    `;

    const params: (string | number)[] = [
        Number(freightId),
        imagePath
    ];
    const result = await conn.query(query, params) as any[];
    return Number(result[0].imageId);
}

export async function createBadFreightConditionImage(conn: Connection, receiptId: number | bigint, imagePath: string): Promise<number> {
    const query = `
        SELECT "imageId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Freight_Condition_Images"
            ("receiptId","imagePath","uploadedAt")
            VALUES (?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
        )
    `;

    const params: (string | number)[] = [
        Number(receiptId),
        imagePath
    ];
    const result = await conn.query(query, params) as any[];
    return Number(result[0].imageId);
}



export async function getFreightImages(conn: Connection, freightId: number | bigint): Promise<WarehouseReceiptFreightImage[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Freight_Images" WHERE "freightId" = ? ORDER BY "uploadedAt" DESC`;
    const result = await conn.query(query, [Number(freightId)]) as any[];
    return result.map((row: any) => ({
        ...row,
        imageId: row.imageId != null ? parseInt(row.imageId) : null,
        freightId: row.freightId != null ? parseInt(row.freightId) : null,
    }));
}

export async function getBadFreightConditionImages(conn: Connection, receiptId: number | bigint): Promise<WarehouseReceiptFreightImage[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Freight_Condition_Images" WHERE "receiptId" = ? ORDER BY "uploadedAt" DESC`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];
    return result.map((row: any) => ({
        ...row,
        imageId: row.imageId != null ? parseInt(row.imageId) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
    }));
}

export async function deleteFreightImage(conn: Connection, imageId: number | bigint): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Images" WHERE "imageId" = ?`;
    await conn.query(query, [Number(imageId)]);
}

export async function deleteFreightImagesByFreight(conn: Connection, freightId: number | bigint): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Images" WHERE "freightId" = ?`;
    await conn.query(query, [Number(freightId)]);
}


export async function getWarehouseReceiptByReceiptNumber(
    conn: Connection,
    receiptNumber: number
): Promise<WarehouseReceipt | null> {
    const query = `
        SELECT w.*, c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" w
        LEFT JOIN ${SCHEMA}."Carrier" c ON w."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON w."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON w."stationId" = s."stationId"
        WHERE w."receiptNumber" = ? AND w."status" = 'INITIATED'
        ORDER BY w."receiptId" DESC
    `;
    const result = await conn.query(query, [Number(receiptNumber)]) as any[];

    if (!result || result.length === 0) {
        return null;
    }

    const row = result[0];
    return {
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : null,
    };
}

export async function getAllWarehouseReceiptByReceiptNumber(
    conn: Connection,
    receiptNumber: number
): Promise<WarehouseReceipt | null> {
    const query = `
        SELECT w.*, c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" w
        LEFT JOIN ${SCHEMA}."Carrier" c ON w."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON w."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON w."stationId" = s."stationId"
        WHERE w."receiptNumber" = ?
        ORDER BY w."receiptId" DESC
    `;
    const result = await conn.query(query, [Number(receiptNumber)]) as any[];

    if (!result || result.length === 0) {
        return null;
    }

    const row = result[0];
    return {
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : null,
    };
}

/**
 * GET WAREHOUSE RECEIPT BY CARRIER AND PRO WITH FULL DETAILS
 */
export async function getWarehouseReceiptByCarrierAndPro(
    conn: Connection,
    carrierId: number | bigint,
    proNumber: string
): Promise<any | null> {
    const query = `
        SELECT wr."receiptId", wr."receiptNumber", wr."status", 
               wr."carrierId", c."carrierName",
               wr."customerId", cu."customerName",
               wr."stationId", s."stationName",
               wr."piecesInland", wr."weightInland",
               wr."proNumber", wr."shipper", wr."toEmails"
        FROM ${SCHEMA}."Warehouse_Receipt" wr
        LEFT JOIN ${SCHEMA}."Carrier" c ON wr."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON wr."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON wr."stationId" = s."stationId"
        WHERE wr."carrierId" = ? AND wr."proNumber" = ?
        ORDER BY wr."receiptId" DESC
        LIMIT 1
    `;
    const result = await conn.query(query, [Number(carrierId), proNumber]) as any[];
    return result.length > 0 ? {
        ...result[0],
        receiptId: result[0].receiptId != null ? parseInt(result[0].receiptId) : null,
        receiptNumber: result[0].receiptNumber != null ? parseInt(result[0].receiptNumber) : null,
    } : null;
}

/**
 * GET WAREHOUSE RECEIPT BY CARRIER NAME AND PRO
 * Checks if a warehouse receipt already exists for carrier+pro combination
 */
export async function checkDuplicateProByCarrierName(
    conn: Connection,
    carrierName: string,
    proNumber: string
): Promise<any | null> {
    const query = `
        SELECT wr."receiptId", wr."receiptNumber", wr."status", 
               wr."carrierId", c."carrierName",
               wr."customerId", cu."customerName",
               wr."stationId", s."stationName",
               wr."piecesInland", wr."weightInland",
               wr."proNumber", wr."shipper", wr."toEmails"
        FROM ${SCHEMA}."Warehouse_Receipt" wr
        LEFT JOIN ${SCHEMA}."Carrier" c ON wr."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON wr."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON wr."stationId" = s."stationId"
        WHERE c."carrierName" = ? AND wr."proNumber" = ?
        ORDER BY wr."receiptId" DESC
        LIMIT 1
    `;
    const result = await conn.query(query, [carrierName, proNumber]) as any[];
    return result.length > 0 ? {
        ...result[0],
        receiptId: result[0].receiptId != null ? parseInt(result[0].receiptId) : null,
        receiptNumber: result[0].receiptNumber != null ? parseInt(result[0].receiptNumber) : null,
    } : null;
}

/**
 * GET WAREHOUSE RECEIPT BY PRO NUMBER
 */
export async function getWarehouseReceiptsByProNumber(
    conn: Connection,
    proNumber: string
): Promise<WarehouseReceipt[]> {
    const query = `
        SELECT wr.*, c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" wr
        LEFT JOIN ${SCHEMA}."Carrier" c ON wr."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON wr."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON wr."stationId" = s."stationId"
        WHERE wr."proNumber" = ? AND wr."status" = 'INITIATE'
        ORDER BY wr."receiptId" DESC 
    `;
    const result = await conn.query(query, [proNumber]) as any[];
    if (!result || result.length === 0) {
        return [];
    }

    return result.map((row) => ({
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : null,
    }));
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

export async function getAuditLogsByReceipt(conn: Connection, receiptId: number | bigint): Promise<AuditLog[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Audit_Log" WHERE "receiptId" = ? ORDER BY "eventTime" DESC`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];
    return result.map((row: any) => ({
        ...row,
        auditLogId: row.auditLogId != null ? parseInt(row.auditLogId) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
    }));
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

export async function getWarehouseReceiptRate(conn: Connection, receiptId: number | bigint): Promise<WarehouseReceiptRate | null> {
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
): Promise<WarehouseReceiptDocuments | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "documentId" = ?`;
    const result = await conn.query(query, [documentId]) as any[];
    return result[0] || null;
}

export async function getDocumentsByReceiptNumber(
    conn: Connection,
    receiptNumber: number
): Promise<WarehouseReceiptDocuments[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "receiptNumber" = ? ORDER BY "createdAt" DESC`;
    const result = await conn.query(query, [receiptNumber]) as any[];
    return result.map((row: any) => ({
        ...row,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
    }));
}

/**
 * GET PRO HEADER DETAILS
 * Query Warehouse_RM_Pro_Detail by PRO number
 */
export async function getProHeaderDetailsByProNumber(
    conn: Connection,
    proNumber: string
): Promise<any | null> {
    const query = `
        SELECT 
            "proDetailId",
            "proNumber",
            "driverNumber",
            "shipperAccountNumber",
            "shipperName",
            "customrAccountNumber",
            "customerName",
            "carrierName",
            "pieces",
            "weight",
            "proDate",
            "customerReferenceNumber",
            "city",
            "hazmat"
        FROM ${SCHEMA}."Warehouse_RM_Pro_Detail"
        WHERE "proNumber" = ?
    `;
    const result = await conn.query(query, [proNumber]) as any[];
    return result.length > 0 ? result[0] : null;
}

/**
 * SAVE PRO DETAIL TO DATABASE
 * Inserts a new PRO detail record
 */
export async function saveProDetail(
    conn: Connection,
    proDetail: {
        proNumber: string;
        driverNumber: string;
        shipperAccountNumber: string;
        shipperName: string;
        customrAccountNumber: string;
        customerName: string;
        carrierName: string;
        pieces: number;
        weight: number;
        proDate?: string;
        customerReferenceNumber?: string;
        city?: string;
        hazmat?: string;
    }
): Promise<number> {
    const query = `
        SELECT "proDetailId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_RM_Pro_Detail"
            ("proNumber", "driverNumber", "shipperAccountNumber", "shipperName",
             "customrAccountNumber", "customerName", "carrierName", "pieces", "weight",
             "proDate", "customerReferenceNumber", "city", "hazmat")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )
    `;

    const params = [
        proDetail.proNumber,
        proDetail.driverNumber,
        proDetail.shipperAccountNumber,
        proDetail.shipperName,
        proDetail.customrAccountNumber,
        proDetail.customerName,
        proDetail.carrierName,
        proDetail.pieces,
        proDetail.weight,
        proDetail.proDate || new Date().toISOString().split('T')[0],
        proDetail.customerReferenceNumber || null,
        proDetail.city || null,
        proDetail.hazmat || 'N'
    ];

    const result = await conn.query(query, params as any[]) as any[];
    return parseInt(result[0].proDetailId);
}

