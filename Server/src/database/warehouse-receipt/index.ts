import { Connection } from "odbc";
import { WarehouseReceipt, WarehouseReceiptTemp, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptFreightImage, WarehouseReceiptDocuments } from "../../entities/warehouse-receipt";
import { SCHEMA } from "../../config/db2";
import { getUserName } from "../maintanance";
import { fromUtcDate, toUtcDate } from "../../utils/dateFormater";

type WarehouseReceiptListItem = WarehouseReceipt & {
    createdByName: string | null;
    approvedByName: string | null;
    requestedByName: string | null;
};

type WarehouseReceiptRateResult = Omit<WarehouseReceiptRate, "rate"> & {
    finalRate: number;
};

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
    receipt: Omit<WarehouseReceipt, "receiptId">
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
                "bandedSkid",
                "shrinkWrappedSkid",
                "shtIppcSkid",
                "plasticSkid",
                "freightCondition",
                "documents",
                "handlingDescription",
                "hazMat",
                "originalDgd",
                "unNumber",
                "class",
                "properShippingName",
                "hazardousDescription",
                "toEmails",
                "cubicMeter",
                "receiptType",
                "notes",
                "receivedBy",
                "location",
                "reWeight",
                "approvalStatus",
                "parentReceipt"
            )
            VALUES (?,?,?,?,?,?,?,COALESCE(?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
        receipt.createdAt instanceof Date ? fromUtcDate(receipt.createdAt) : null,
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
        receipt.bandedSkid === 'Y' ? 'Y' : 'N',
        receipt.shrinkWrappedSkid === 'Y' ? 'Y' : 'N',
        receipt.shtIppcSkid === 'Y' ? 'Y' : 'N',
        receipt.plasticSkid === 'Y' ? 'Y' : 'N',
        receipt.freightCondition === 'Y' ? 'Y' : 'N',
        receipt.documents === 'Y' ? 'Y' : 'N',
        receipt.handlingDescription ?? null,
        receipt.hazMat === 'Y' ? 'Y' : 'N',
        receipt.originalDgd === 'Y' ? 'Y' : 'N',
        Array.isArray(receipt.unNumber) ? JSON.stringify(receipt.unNumber) : receipt.unNumber ?? null,
        Array.isArray(receipt.class) ? JSON.stringify(receipt.class) : receipt.class ?? null,
        receipt.properShippingName ?? '',
        receipt.hazardousDescription ?? '',
        Array.isArray(receipt.toEmails) ? JSON.stringify(receipt.toEmails) : receipt.toEmails ?? null,
        receipt.cubicMeter !== undefined ? Number(receipt.cubicMeter) : null,
        receipt.receiptType ?? 'Regular',
        receipt.notes ?? '',
        receipt.receivedBy ?? '',
        receipt.location ?? '',
        receipt.reWeight ?? 0,
        receipt.approvalStatus ?? null,
        receipt.parentReceipt !== undefined && receipt.parentReceipt !== null ? Number(receipt.parentReceipt) : null
    ];

    console.log("Executing createWarehouseReceipt query:", query, "with params:", params);

    const result = await conn.query(query, params as any) as any[];
    return result[0]?.receiptId;
}


export async function getWarehouseReceiptById(
    conn: Connection,
    receiptId: number
): Promise<WarehouseReceipt & { carrierName: string; customerName: string; stationName: string } | null> {
    console.log("Fetching warehouse receipt by ID:", receiptId);

    const query = `
        SELECT "wh".*, "c"."carrierName", "cust"."customerName", "s"."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" "wh"
        LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wh"."carrierId" = "c"."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wh"."customerId" = "cust"."customerId"
        LEFT JOIN ${SCHEMA}."Station" "s" ON "wh"."stationId" = "s"."stationId" 
        WHERE "wh"."receiptId" = ?
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
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : null,
        createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
        updatedAt: row.updatedAt ? toUtcDate(row.updatedAt) : null,
    };
}


export async function getWarehouseReceiptByReceiptNumber(
    conn: Connection,
    receiptNumber: number
): Promise<WarehouseReceipt & { carrierName: string; customerName: string; stationName: string } | null> {
    console.log("Fetching warehouse receipt by ID:", receiptNumber);

    const query = `
        SELECT "wh".*, "c"."carrierName", "cust"."customerName", "s"."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" "wh"
        LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wh"."carrierId" = "c"."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wh"."customerId" = "cust"."customerId"
        LEFT JOIN ${SCHEMA}."Station" "s" ON "wh"."stationId" = "s"."stationId" 
        WHERE "wh"."receiptNumber" = ?
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
        createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
        updatedAt: row.updatedAt ? toUtcDate(row.updatedAt) : null,
    };
}


export async function getWarehouseReceiptForShipment(
    conn: Connection,
    receiptNumber?: number,
    startDate?: string,
    endDate?: string,
    proNumber?: string[],
): Promise<{ receiptId: number; receiptNumber: number; proNumber: string; carrierName: string; customerName: string; stationName: string; verificationId: number; customerId: number; stationId: number; carrierId: number; piecesInland: number; reWeight: number }[] | null> {

    let query = `
        SELECT "wh"."receiptId", "wh"."receiptNumber", "wh"."proNumber", "c"."carrierName", "cust"."customerName", "s"."stationName", "wh"."verificationId", "wh"."customerId", "wh"."stationId", "wh"."carrierId", "wh"."piecesInland", "wh"."reWeight"
        FROM ${SCHEMA}."Warehouse_Receipt" "wh"
        LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wh"."carrierId" = "c"."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wh"."customerId" = "cust"."customerId"
        LEFT JOIN ${SCHEMA}."Station" "s" ON "wh"."stationId" = "s"."stationId" 
        WHERE "status" = 'ON_HAND'
    `;

    let params: any[] = [];

    if (receiptNumber) {
        query += ` AND "wh"."receiptNumber" LIKE ?`;
        params.push(`%${receiptNumber}%`);
    }

    if (startDate) {
        query += ` AND "wh"."createdAt" >= CAST(? AS TIMESTAMP)`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND "wh"."createdAt" <= CAST(? AS TIMESTAMP)`;
        params.push(endDate);
    }

    if (proNumber && proNumber.length > 0) {
        const placeholders = proNumber.map(() => '?').join(', ');
        query += ` AND "wh"."proNumber" IN (${placeholders})`;
        params.push(...proNumber);
    }

    console.log("Executing getWarehouseReceiptForShipment query:", query, "with params:", params);


    const result = await conn.query(query, params) as any[];

    if (!result || result.length === 0) {
        return null;
    }


    return result.map((row: any) => ({
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
    }));
}



export async function getWarehouseReceiptsByVerification(
    conn: Connection,
    verificationId: number
): Promise<WarehouseReceipt[]> {
    const query = `
        SELECT "wh".*, "c"."carrierName", "cust"."customerName", "s"."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" "wh"
        LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wh"."carrierId" = "c"."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wh"."customerId" = "cust"."customerId"
        LEFT JOIN ${SCHEMA}."Station" "s" ON "wh"."stationId" = "s"."stationId"
        WHERE "wh"."verificationId" = ? 
        ORDER BY "wh"."receiptNumber" DESC
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
        createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
        updatedAt: row.updatedAt ? toUtcDate(row.updatedAt) : null,
    }));
}

export async function getWarehouseReceiptsByCustomerStation(conn: Connection, customerId: number, stationId: number): Promise<WarehouseReceipt[]> {
    const query = `SELECT "wr".* FROM ${SCHEMA}."Warehouse_Receipt" "wr" WHERE "wr"."customerId" = ? AND "wr"."stationId" = ? ORDER BY "wr"."receiptNumber" DESC`;
    const result = await conn.query(query, [customerId, stationId]) as WarehouseReceipt[];
    return result.map((row: any) => ({
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
        updatedAt: row.updatedAt ? toUtcDate(row.updatedAt) : null,
    }));
}

export async function listWarehouseReceipts(
    conn: Connection,
    limit?: number,
    offset?: number,
    status?: string,
    approvalStatus?: string,
    receiptNumber?: string,
    accounting?: boolean,
    filters?: {
        startDate?: string;
        endDate?: string;
        customerId?: number;
        stationId?: number;
        carrierId?: number;
        location?: string;
        proNumber?: string;
        verificationId?: number;
        destination?: string;
        packageId?: string;
        customerRefNumber?: string;
    },
    filterLogic: "AND" | "OR" = "AND"
): Promise<{ data: WarehouseReceiptListItem[]; total: number }> {
    let query = `
    SELECT "wr".*, "c"."carrierName", "cust"."customerName", "s"."stationName"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wr"."carrierId" = "c"."carrierId"
    LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wr"."customerId" = "cust"."customerId"
    LEFT JOIN ${SCHEMA}."Station" "s" ON "wr"."stationId" = "s"."stationId"
    WHERE 1=1`;
    const params: any[] = [];

    // Common filters (always AND)
    if (status) {
        query += ` AND "wr"."status" = ?`;
        params.push(status);
    }

    if (approvalStatus) {
        query += ` AND "wr"."approvalStatus" = ?`;
        params.push(approvalStatus);
    }

    if (receiptNumber) {
        query += ` AND "wr"."receiptNumber" LIKE ?`;
        params.push(`%${receiptNumber}%`);
    }

    if (accounting) {
        query += ` AND "wr"."accountOnHold" = 'Y'`;
    }

    if (!accounting) {
        query += ` AND "wr"."accountOnHold" = 'N'`;
    }

    // Special filters (grouped with filterLogic)
    const specialConditions: string[] = [];
    const specialParams: any[] = [];

    if (filters?.startDate) {
        specialConditions.push(`"wr"."createdAt" >= CAST(? AS TIMESTAMP)`);
        specialParams.push(filters.startDate);
    }

    if (filters?.endDate) {
        specialConditions.push(`"wr"."createdAt" <= CAST(? AS TIMESTAMP)`);
        specialParams.push(filters.endDate);
    }

    if (filters?.customerId) {
        specialConditions.push(`"wr"."customerId" = ?`);
        specialParams.push(filters.customerId);
    }

    if (filters?.stationId) {
        specialConditions.push(`"wr"."stationId" = ?`);
        specialParams.push(filters.stationId);
    }

    if (filters?.carrierId) {
        specialConditions.push(`"wr"."carrierId" = ?`);
        specialParams.push(filters.carrierId);
    }

    if (filters?.location) {
        specialConditions.push(`"wr"."location" LIKE ?`);
        specialParams.push(`%${filters.location}%`);
    }

    if (filters?.proNumber) {
        specialConditions.push(`"wr"."proNumber" LIKE ?`);
        specialParams.push(`%${filters.proNumber}%`);
    }

    if (filters?.verificationId) {
        specialConditions.push(`"wr"."verificationId" = ?`);
        specialParams.push(filters.verificationId);
    }

    if (filters?.destination) {
        specialConditions.push(`"wr"."destination" LIKE ?`);
        specialParams.push(`%${filters.destination}%`);
    }

    if (filters?.packageId) {
        specialConditions.push(`"wr"."packageId" LIKE ?`);
        specialParams.push(`%${filters.packageId}%`);
    }

    if (filters?.customerRefNumber) {
        specialConditions.push(`"wr"."customerRefNumber" LIKE ?`);
        specialParams.push(`%${filters.customerRefNumber}%`);
    }

    if (specialConditions.length > 0) {
        query += ` AND (${specialConditions.join(` ${filterLogic} `)})`;
        params.push(...specialParams);
    }

    query += ` ORDER BY "wr"."receiptNumber" DESC`;

    if (typeof limit === 'number' && typeof offset === 'number') {
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
    }

    console.log("LIMIT And OFFSET values:", limit, offset);

    console.log("Executing listWarehouseReceipts query:", query);

    const result = await conn.query(query, params) as WarehouseReceipt[];

    const receipts: WarehouseReceiptListItem[] = await Promise.all(result.map(async (row: any): Promise<WarehouseReceiptListItem> => ({
        ...row,
        receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        verificationId: row.verificationId != null ? parseInt(row.verificationId) : null,
        noteThreadId: row.noteThreadId != null ? parseInt(row.noteThreadId) : null,
        entityId: row.entityId != null ? parseInt(row.entityId) : null,
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : [],
        unNumber: row.unNumber ? JSON.parse(row.unNumber) : [],
        class: row.class ? JSON.parse(row.class) : [],
        createdByName: row.createdBy ? await getUserName(conn, row.createdBy) : null,
        approvedByName: row.approvedBy ? await getUserName(conn, row.approvedBy) : null,
        requestedByName: row.requestedBy ? await getUserName(conn, row.requestedBy) : null,
        createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
        updatedAt: row.updatedAt ? toUtcDate(row.updatedAt) : null,
        requestedAt: row.requestedAt ? toUtcDate(row.requestedAt) : null,
        approvedAt: row.approvedAt ? toUtcDate(row.approvedAt) : null,
    })));

    // Total query (same logic)
    let totalQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    LEFT JOIN ${SCHEMA}."Carrier" "c" ON "wr"."carrierId" = "c"."carrierId"
    LEFT JOIN ${SCHEMA}."Customer" "cust" ON "wr"."customerId" = "cust"."customerId"
    LEFT JOIN ${SCHEMA}."Station" "s" ON "wr"."stationId" = "s"."stationId"
    WHERE 1=1`;
    const totalParams: any[] = [];

    if (status) {
        totalQuery += ` AND "wr"."status" = ?`;
        totalParams.push(status);
    }

    if (approvalStatus) {
        totalQuery += ` AND "wr"."approvalStatus" = ?`;
        totalParams.push(approvalStatus);
    }

    if (receiptNumber) {
        totalQuery += ` AND "wr"."receiptNumber" LIKE ?`;
        totalParams.push(`%${receiptNumber}%`);
    }

    if (accounting) {
        totalQuery += ` AND "wr"."accountOnHold" = 'Y'`;
    }

    if (!accounting) {
        totalQuery += ` AND "wr"."accountOnHold" = 'N'`;
    }

    if (specialConditions.length > 0) {
        totalQuery += ` AND (${specialConditions.join(` ${filterLogic} `)})`;
        totalParams.push(...specialParams);
    }

    const totalResult = await conn.query(totalQuery, totalParams) as { total: number }[];
    const total = totalResult[0]?.total || 0;

    return { data: receipts, total };
}

export async function getCountOfWarehouseReceipts(conn: Connection): Promise<{ active: number; accounting: number; initiate: number; onHand: number; prepared: number; scanned: number; shipped: number; rejected: number; archived: number, ready: number, pending: number }> {
    let activeCountQuery = `
    SELECT COUNT(*) as "total" 
    FROM ${SCHEMA}."Warehouse_Receipt" "wr" 
    WHERE "wr"."accountOnHold" = 'N'`;
    const params: any[] = [];

    let accountingCountQuery = `
    SELECT COUNT(*) as "total" 
    FROM ${SCHEMA}."Warehouse_Receipt" "wr" 
    WHERE "wr"."accountOnHold" = 'Y'`;

    let initiateCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'INITIATED'`;

    let onHandCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'ON_HAND' AND "wr"."accountOnHold" = 'N'`;

    let preparedCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'PREPARED'`;

    let scannedCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'SCANNED'`;

    let shippedCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'SHIPPED'`;

    let rejectedCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'REJECTED'`;

    let archivedCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."status" = 'ARCHIVED'`;

    let readyCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."approvalStatus" = 'READY'`;

    let pendingCountQuery = `
    SELECT COUNT(*) as "total"
    FROM ${SCHEMA}."Warehouse_Receipt" "wr"
    WHERE "wr"."approvalStatus" = 'PENDING'`;



    const activeCount = await conn.query(activeCountQuery, params) as { total: number }[];
    const accountingCount = await conn.query(accountingCountQuery, params) as { total: number }[];
    const initiateCount = await conn.query(initiateCountQuery, params) as { total: number }[];
    const onHandCount = await conn.query(onHandCountQuery, params) as { total: number }[];
    const preparedCount = await conn.query(preparedCountQuery, params) as { total: number }[];
    const scannedCount = await conn.query(scannedCountQuery, params) as { total: number }[];
    const shippedCount = await conn.query(shippedCountQuery, params) as { total: number }[];
    const rejectedCount = await conn.query(rejectedCountQuery, params) as { total: number }[];
    const archivedCount = await conn.query(archivedCountQuery, params) as { total: number }[];
    const readyCount = await conn.query(readyCountQuery, params) as { total: number }[];
    const pendingCount = await conn.query(pendingCountQuery, params) as { total: number }[];
    const getCount = (result: { total: number | bigint }[]) => Number(result[0]?.total ?? 0);

    return {
        active: getCount(activeCount),
        accounting: getCount(accountingCount),
        initiate: getCount(initiateCount),
        onHand: getCount(onHandCount),
        prepared: getCount(preparedCount),
        scanned: getCount(scannedCount),
        shipped: getCount(shippedCount),
        rejected: getCount(rejectedCount),
        archived: getCount(archivedCount),
        ready: getCount(readyCount),
        pending: getCount(pendingCount)
    };
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
    if (updates.documents !== undefined) {
        fields.push(`"documents" = ?`);
        params.push(updates.documents == 'Y' ? 'Y' : 'N');
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

    if (updates.receiptType !== undefined) {
        fields.push(`"receiptType" = ?`);
        params.push(updates.receiptType ?? 'Regular');
    }

    if (updates.notes !== undefined) {
        fields.push(`"notes" = ?`);
        params.push(updates.notes ? updates.notes : '' as string);
    }

    if (updates.accountOnHold !== undefined) {
        fields.push(`"accountOnHold" = ?`);
        params.push(updates.accountOnHold == 'Y' ? 'Y' : 'N');
    }

    if (updates.sendToTellSystem !== undefined) {
        fields.push(`"sendToTellSystem" = ?`);
        params.push(updates.sendToTellSystem == 'Y' ? 'Y' : 'N');
    }

    if (updates.approvalStatus !== undefined) {
        fields.push(`"approvalStatus" = ?`);
        params.push(updates.approvalStatus ?? null);
    }

    if (updates.hasFlatRate !== undefined) {
        fields.push(`"hasFlatRate" = ?`);
        params.push(updates.hasFlatRate == 'Y' ? 'Y' : 'N');
    }

    if (updates.notesForFlatRate !== undefined) {
        fields.push(`"notesForFlatRate" = ?`);
        params.push(updates.notesForFlatRate ?? null);
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
    console.log(query);
    params.push(Number(receiptId));
    console.log(params);


    await conn.query(query, params as any[]);
}


export async function updateWarehouseReceiptForReadyForApproval(conn: Connection, receiptId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.approvalStatus !== undefined) {
        fields.push(`"approvalStatus" = ?`);
        params.push(updates.approvalStatus ?? null);
    }

    if (updates.hasFlatRate !== undefined) {
        fields.push(`"hasFlatRate" = ?`);
        params.push(updates.hasFlatRate == 'Y' ? 'Y' : 'N');
    }

    if (updates.notesForFlatRate !== undefined) {
        fields.push(`"notesForFlatRate" = ?`);
        params.push(updates.notesForFlatRate ?? null);
    }

    if (updates.requestedBy !== undefined) {
        fields.push(`"requestedBy" = ?`);
        params.push(updates.requestedBy ?? null);
    }

    fields.push(`"requestedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)`);

    if (fields.length === 0) return;

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET ${fields.join(', ')} WHERE "receiptId" = ?`;
    params.push(Number(receiptId));

    await conn.query(query, params as any[]);
}

export async function updateWarehouseReceiptApproval(conn: Connection, receiptId: number, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.approvalStatus !== undefined) {
        fields.push(`"approvalStatus" = ?`);
        params.push(updates.approvalStatus ?? null);
    }

    if (updates.accountOnHold !== undefined) {
        fields.push(`"accountOnHold" = ?`);
        params.push(updates.accountOnHold == 'Y' ? 'Y' : 'N');
    }

    if (updates.hasFlatRate !== undefined) {
        fields.push(`"hasFlatRate" = ?`);
        params.push(updates.hasFlatRate == 'Y' ? 'Y' : 'N');
    }

    if (updates.notesForFlatRate !== undefined) {
        fields.push(`"notesForFlatRate" = ?`);
        params.push(updates.notesForFlatRate ?? null);
    }

    if (updates.approvedBy !== undefined) {
        fields.push(`"approvedBy" = ?`);
        params.push(updates.approvedBy ?? null);
    }


    fields.push(`"approvedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)`);

    if (fields.length === 0) return;

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
            ("receiptId", "pieces", "type", "length", "width", "height", "weight", "cubicMeter", "freightBarcodeValue")
            VALUES (?,?,?,?,?,?,?,?,?)
        )
        `;

    const params: (string | number | null)[] = [
        Number(freight.receiptId),
        freight.pieces,
        freight.type,
        freight.length != null ? Number(freight.length) : null,
        freight.width != null ? Number(freight.width) : null,
        freight.height != null ? Number(freight.height) : null,
        freight.weight != null ? Number(freight.weight) : null,
        freight.cubicMeter != null ? Number(freight.cubicMeter) : null,
        freight.freightBarcodeValue != null ? freight.freightBarcodeValue : null
    ];

    console.log("Executing createFreightInfo query:", query);
    console.log("With parameters:", params);
    const result = await conn.query(query, params as any) as any[];
    return result[0].freightId;
}

export async function getFreightInfosByReceipt(conn: Connection, receiptId: number | bigint): Promise<FreightInfo[]> {
    const query = `
    SELECT * 
    FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info" 
    WHERE "receiptId" = ?
    ORDER BY "freightBarcodeValue" ASC`;

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

export async function getFreightInfosForScanByReceipt(
    conn: Connection,
    receiptId: number | bigint
): Promise<Array<{ freightId: number | null; freightBarcodeValue: string | null; isScanned: string | null }>> {
    const query = `
        SELECT "freightId", "freightBarcodeValue", "isScanned"
        FROM ${SCHEMA}."Warehouse_Receipt_Freight_Info"
        WHERE "receiptId" = ?
    `;
    const result = await conn.query(query, [Number(receiptId)]) as any[];

    return result.map((row: any) => ({
        freightId: row.freightId != null ? parseInt(row.freightId) : null,
        freightBarcodeValue: row.freightBarcodeValue ?? null,
        isScanned: row.isScanned ?? null,
    }));
}

export async function markFreightAsScanned(conn: Connection, freightId: number | bigint): Promise<boolean> {
    const query = `
        SELECT 1 AS "updated"
        FROM FINAL TABLE (
            UPDATE ${SCHEMA}."Warehouse_Receipt_Freight_Info"
            SET "isScanned" = 'Y'
            WHERE "freightId" = ?
              AND COALESCE("isScanned", 'N') <> 'Y'
        )
    `;

    const result = await conn.query(query, [Number(freightId)]) as any[];
    return Array.isArray(result) && result.length > 0;
}

export async function updateFreightInfo(conn: Connection, freightId: number | bigint, updates: any): Promise<void> {
    const fields: string[] = [];
    const params: (string | number | string[])[] = [];

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
    if (updates.isScanned !== undefined) {
        fields.push(`"isScanned" = ?`);
        params.push(updates.isScanned === true ? 'Y' : updates.isScanned === false ? 'N' : updates.isScanned);
    }
    if (updates.cubicMeter !== undefined) {
        fields.push(`"cubicMeter" = ?`);
        params.push(updates.cubicMeter);
    }
    if (updates.freightBarcodeValue !== undefined) {
        fields.push(`"freightBarcodeValue" = ?`);
        params.push(updates.freightBarcodeValue);
    }

    if (fields.length === 0) return;

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt_Freight_Info" SET ${fields.join(', ')} WHERE "freightId" = ?`;
    params.push(Number(freightId));

    await conn.query(query, params as any);
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

export async function deleteFreightImageByPath(conn: Connection, freightId: number | bigint, imagePath: string): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Images" WHERE "freightId" = ? AND "imagePath" = ?`;
    await conn.query(query, [Number(freightId), imagePath]);
}

export async function deleteBadFreightConditionImageByPath(conn: Connection, receiptId: number | bigint, imagePath: string): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Freight_Condition_Images" WHERE "receiptId" = ? AND "imagePath" = ?`;
    await conn.query(query, [Number(receiptId), imagePath]);
}

export async function getWarehouseReceiptByReceiptNumberForInitiated(
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
export async function getWarehouseReceiptsByProNumberForInitiated(
    conn: Connection,
    proNumber: string
): Promise<WarehouseReceipt[]> {
    const query = `
        SELECT wr.*, c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."Warehouse_Receipt" wr
        LEFT JOIN ${SCHEMA}."Carrier" c ON wr."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON wr."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON wr."stationId" = s."stationId"
        WHERE wr."proNumber" = ? AND wr."status" = 'INITIATED'
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

export async function getAuditLogsByReceiptId(
    conn: Connection,
    receiptId: number | bigint
): Promise<AuditLog[]> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Audit_Log" WHERE "receiptId" = ? ORDER BY "auditLogId" ASC`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];

    const logs = await Promise.all(
        result.map(async (row: any) => ({
            ...row,
            auditLogId: row.auditLogId != null ? parseInt(row.auditLogId) : null,
            receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
            receiptNumber: row.receiptNumber != null ? parseInt(row.receiptNumber) : null,
            userName: await getUserName(conn, row.userId),
            createdAt: row.eventTime ? toUtcDate(row.eventTime) : null,
        }))
    );

    return logs;
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
    SELECT "rateId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Warehouse_Receipt_Rate"
        ("receiptId","rate","dimFactor","baseRate","minRate","maxRate")
      VALUES (?,?,?,?,?,?)
    )
  `;
    const params: (string | number)[] = [
        Number(rateData.receiptId),
        rateData.rate,
        (rateData.dimFactor || 0) as string | number,
        (rateData.baseRate || 0) as string | number,
        (rateData.minRate || 0) as string | number,
        (rateData.maxRate || 0) as string | number
    ];
    const result = await conn.query(query, params) as any[];
    return result[0].rateId;
}

export async function getWarehouseReceiptRate(
    conn: Connection,
    receiptId: number | bigint
): Promise<WarehouseReceiptRateResult | null> {
    const query = `
    SELECT 
      "receiptId",
      "rateId", 
      "rate" AS "finalRate",
      "minRate", 
      "maxRate", 
      "baseRate"
    FROM ${SCHEMA}."Warehouse_Receipt_Rate" 
    WHERE "receiptId" = ?
  `;
    const result = (await conn.query(query, [Number(receiptId)])) as WarehouseReceiptRateResult[];
    return result.length > 0 ? {
        ...result[0],
        receiptId: Number(result[0].receiptId),
        rateId: Number(result[0].rateId),
        finalRate: Number(result[0].finalRate),
        minRate: Number(result[0].minRate),
        maxRate: Number(result[0].maxRate),
        baseRate: Number(result[0].baseRate),
    } : null;
}


export async function updateWarehouseReceiptRate(conn: Connection, receiptId: number, updates: any): Promise<void> {
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

    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt_Rate" SET ${fields.join(', ')} WHERE "receiptId" = ?`;
    params.push(Number(receiptId));

    await conn.query(query, params);
}

/**
 * WAREHOUSE RECEIPT DOCUMENTS
 */
export async function createWarehouseReceiptDocument(
    conn: Connection,
    receiptId: number,
    filePath?: string | null,
    fileType?: string | null,
    userId?: number | null
): Promise<{ documentId: number, filePath: string | null, fileType: string | null, uploadedAt: Date | null, uploadedBy: number | null }> {
    const query = `
    SELECT "documentId", "filePath", "fileType" , "uploadedAt", "uploadedBy"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Warehouse_Receipt_Documents"
        ("receiptId", "filePath", "fileType", "uploadedAt", "uploadedBy")
      VALUES (?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?)
    )
  `;

    const result = await conn.query(query, [receiptId, filePath ?? null, fileType ?? null, userId ?? null] as any[]) as any[];
    return {
        documentId: Number(result[0].documentId),
        filePath: result[0].filePath,
        fileType: result[0].fileType,
        uploadedAt: result[0].uploadedAt ? toUtcDate(result[0].uploadedAt) : null,
        uploadedBy: result[0].uploadedBy
    };
}


export async function getWarehouseReceiptDocument(
    conn: Connection,
    documentId: number
): Promise<WarehouseReceiptDocuments | null> {
    const query = `SELECT * FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "documentId" = ?`;
    const result = await conn.query(query, [documentId]) as any[];
    return result[0] || null;
}

export async function deleteWarehouseReceiptDocument(
    conn: Connection,
    documentId: number | bigint
): Promise<void> {
    const query = `DELETE FROM ${SCHEMA}."Warehouse_Receipt_Documents" WHERE "documentId" = ?`;
    await conn.query(query, [Number(documentId)]);
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

export async function getDocumentsByReceiptId(
    conn: Connection,
    receiptId: number | bigint
): Promise<WarehouseReceiptDocuments[]> {
    const query = `SELECT "wrd".* , "u"."userName" as "uploadedByName"
    FROM ${SCHEMA}."Warehouse_Receipt_Documents" as "wrd"
    LEFT JOIN ${SCHEMA}."User" "u" ON "u"."userId" = "wrd"."uploadedBy"
    WHERE "wrd"."receiptId" = ? ORDER BY "wrd"."documentId" DESC`;
    const result = await conn.query(query, [Number(receiptId)]) as any[];
    return result.map((row: any) => ({
        ...row,
        documentId: row.documentId != null ? parseInt(row.documentId) : null,
        receiptId: row.receiptId != null ? parseInt(row.receiptId) : null,
        uploadedAt: row.uploadedAt ? toUtcDate(row.uploadedAt) : null,
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

export async function updateWarehouseReceiptLocation(conn: Connection, receiptId: number, location: string): Promise<void> {
    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET "location" = ? WHERE "receiptId" = ?`;
    await conn.query(query, [location, Number(receiptId)]);
}

export async function warehouseReceiptAccountHold(conn: Connection, receiptId: number, accountOnHold: 'Y' | 'N', approvalStatus: 'PENDING' | 'READY' | 'APPROVED'): Promise<void> {
    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET "accountOnHold" = ?, "approvalStatus" = ? WHERE "receiptId" = ?`;
    await conn.query(query, [accountOnHold, approvalStatus, Number(receiptId)]);
}

export async function updateWarehouseReceiptApprovalStatus(conn: Connection, receiptId: number, status: string): Promise<void> {
    const query = `UPDATE ${SCHEMA}."Warehouse_Receipt" SET "status" = ? WHERE "receiptId" = ?`;
    await conn.query(query, [status, Number(receiptId)]);
}

export async function createFreightInfoTemp(conn: Connection): Promise<number> {
    const query = `
        SELECT "freightBarcodeValue"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Receipt_Freight_Info_Temp"
            ("freightBarcodeValue")
            VALUES ('TEMP')
        )
    `;

    const result = await conn.query(query) as any[];
    return result[0].freightBarcodeValue;
}