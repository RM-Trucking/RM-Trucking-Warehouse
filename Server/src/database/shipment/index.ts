import { Connection } from "odbc";
import { SCHEMA } from "../../config/db2";

export async function createShipment(conn: Connection, payload: any, userId: number): Promise<number> {
    const query = `
        SELECT "shipmentId" FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Shipment"
            (
                "shipmentType",
                "barcodeNumber",
                "customerId",
                "stationId",
                "consigneeId",
                "airBillNumber",
                "booking",
                "customerRefNumber",
                "additionalRefNumber",
                "pieces",
                "weight",
                "instructions",
                "createdAt",
                "createdBy",
                "isCanceled",
                "isShipped",
                "isScanned",
                "pickupEntry",
                "pickupEntryNumber",
                "entityId",
                "noteThreadId"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?, ?, ?, ?, ?, ?, ?, ?)
        )
    `;

    const params = [
        payload.shipmentType,
        payload.barcodeNumber,
        payload.customerId,
        payload.stationId,
        payload.consigneeId,
        payload.airBillNumber,
        payload.booking,
        payload.customerRefNumber,
        payload.additionalRefNumber,
        payload.pieces,
        payload.weight,
        payload.instructions,
        payload.createdBy ?? userId,
        "N",
        "N",
        "N",
        "N",
        null,
        payload.entityId,
        payload.noteThreadId
    ];

    const result = await conn.query(query, params as any) as any[];
    return result[0].shipmentId;
}

export async function updateShipment(conn: Connection, shipmentId: number, payload: any, userId: number): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(payload).forEach(([key, value]) => {
        if (key === "shipmentId" || key === "containers" || key === "receipts") {
            return;
        }

        fields.push(`"${key}" = ?`);
        params.push(value);
    });

    fields.push(`"updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)`);
    params.push(shipmentId);

    const query = `
        UPDATE ${SCHEMA}."Warehouse_Shipment"
        SET ${fields.join(", ")}
        WHERE "shipmentId" = ?
    `;

    await conn.query(query, params as any);
}

export async function getShipmentById(conn: Connection, shipmentId: number): Promise<any | null> {
    const query = `
        SELECT ws.*, cus."customerName", st."stationName", air."airlineName", air."airlineCode", air."airlineNumber", air."airportCode"
        FROM ${SCHEMA}."Warehouse_Shipment" as ws
        LEFT JOIN ${SCHEMA}."Customer" as cus ON ws."customerId" = cus."customerId"
        LEFT JOIN ${SCHEMA}."Station" as st ON ws."stationId" = st."stationId"
        LEFT JOIN ${SCHEMA}."Airline" as air ON ws."consigneeId" = air."airlineId"
        WHERE ws."shipmentId" = ?
    `;

    const result = await conn.query(query, [shipmentId]) as any[];
    return result.length > 0 ? result[0] : null;
}

export async function getShipmentByIdForPickup(conn: Connection, shipmentId: number): Promise<any | null> {
    const query = `
         SELECT ws.*, cus."customerName", st."stationName",
             st."rmAccountNumber" AS "stationRMAccountNumber",
             addr."line1" AS "stationAddressLine1",
             addr."line2" AS "stationAddressLine2",
             addr."city" AS "stationCity",
             addr."state" AS "stationState",
             addr."zipCode" AS "stationZipCode",
             st."phoneNumber" AS "stationPhoneNumber",
             air."airlineName", air."airlineCode", air."airlineNumber", air."airportCode"
        FROM ${SCHEMA}."Warehouse_Shipment" as ws
        LEFT JOIN ${SCHEMA}."Customer" as cus ON ws."customerId" = cus."customerId"
        LEFT JOIN ${SCHEMA}."Station" as st ON ws."stationId" = st."stationId"
        LEFT JOIN ${SCHEMA}."Entity_Address_Map" as eam ON st."entityId" = eam."entityId"
        LEFT JOIN ${SCHEMA}."Address" as addr ON eam."addressId" = addr."addressId"
        LEFT JOIN ${SCHEMA}."Airline" as air ON ws."consigneeId" = air."airlineId"
        WHERE ws."shipmentId" = ?
    `;

    const result = await conn.query(query, [shipmentId]) as any[];
    return result.length > 0 ? result[0] : null;
}

export async function listShipments(
    conn: Connection,
    filters: { searchTerm?: string; page?: number; pageSize?: number; scanned?: boolean; pickup?: boolean; shipped?: boolean; request?: boolean }
): Promise<any[]> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let query = `
        SELECT "shipmentId"
        FROM ${SCHEMA}."Warehouse_Shipment"
        WHERE 1 = 1
    `;

    const params: any[] = [];
    if (filters.searchTerm) {
        const searchValue = `%${filters.searchTerm.toUpperCase()}%`;
        query += ` AND (
            UPPER("barcodeNumber") LIKE ? OR
            UPPER(COALESCE("airBillNumber", '')) LIKE ? OR
            CAST("shipmentId" AS VARCHAR(20)) LIKE ?
        )`;
        params.push(searchValue, searchValue, searchValue);
    }

    // request filter maps to completeStatus = 'REQUESTED' or 'SPLIT_APPROVED'
    if (typeof filters.request !== "undefined") {
        if (filters.request) {
            query += ` AND UPPER(COALESCE("completeStatus", '')) IN ('REQUESTED', 'SPLIT_APPROVED')`;
        } else {
            query += ` AND UPPER(COALESCE("completeStatus", '')) NOT IN ('REQUESTED', 'SPLIT_APPROVED')`;
        }
    }

    // scanned filter -> isScanned = 'Y'
    if (typeof filters.scanned !== "undefined") {
        if (filters.scanned) {
            query += ` AND UPPER(COALESCE("isScanned", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("isScanned", 'N')) <> 'Y'`;
        }
    }

    // pickup filter -> pickupEntry = 'Y'
    if (typeof filters.pickup !== "undefined") {
        if (filters.pickup) {
            query += ` AND UPPER(COALESCE("pickupEntry", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("pickupEntry", 'N')) <> 'Y'`;
        }
    }

    // shipped filter -> isShipped = 'Y'
    if (typeof filters.shipped !== "undefined") {
        if (filters.shipped) {
            query += ` AND UPPER(COALESCE("isShipped", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("isShipped", 'N')) <> 'Y'`;
        }
    }

    query += ` ORDER BY "shipmentId" DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await conn.query(query, params as any) as any[];
}

export async function countShipments(
    conn: Connection,
    filters: { searchTerm?: string; scanned?: boolean; pickup?: boolean; shipped?: boolean; request?: boolean }
): Promise<number> {
    let query = `SELECT COUNT(*) AS "total" FROM ${SCHEMA}."Warehouse_Shipment" WHERE 1 = 1`;
    const params: any[] = [];

    if (filters.searchTerm) {
        const searchValue = `%${filters.searchTerm.toUpperCase()}%`;
        query += ` AND (
            UPPER("barcodeNumber") LIKE ? OR
            UPPER(COALESCE("airBillNumber", '')) LIKE ? OR
            CAST("shipmentId" AS VARCHAR(20)) LIKE ?
        )`;
        params.push(searchValue, searchValue, searchValue);
    }

    if (typeof filters.request !== "undefined") {
        if (filters.request) {
            query += ` AND UPPER(COALESCE("completeStatus", '')) IN ('REQUESTED', 'SPLIT_APPROVED')`;
        } else {
            query += ` AND UPPER(COALESCE("completeStatus", '')) NOT IN ('REQUESTED', 'SPLIT_APPROVED')`;
        }
    }

    if (typeof filters.scanned !== "undefined") {
        if (filters.scanned) {
            query += ` AND UPPER(COALESCE("isScanned", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("isScanned", 'N')) <> 'Y'`;
        }
    }

    if (typeof filters.pickup !== "undefined") {
        if (filters.pickup) {
            query += ` AND UPPER(COALESCE("pickupEntry", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("pickupEntry", 'N')) <> 'Y'`;
        }
    }

    if (typeof filters.shipped !== "undefined") {
        if (filters.shipped) {
            query += ` AND UPPER(COALESCE("isShipped", 'N')) = 'Y'`;
        } else {
            query += ` AND UPPER(COALESCE("isShipped", 'N')) <> 'Y'`;
        }
    }

    const result = await conn.query(query, params as any) as any[];
    return parseInt(result[0].total, 10);
}

export async function replaceContainers(conn: Connection, shipmentId: number, containers: Array<{ container: string }>): Promise<void> {
    await conn.query(`DELETE FROM ${SCHEMA}."Warehouse_Shipment_Containers" WHERE "shipmentId" = ?`, [shipmentId]);

    if (!containers || containers.length === 0) {
        return;
    }

    const query = `INSERT INTO ${SCHEMA}."Warehouse_Shipment_Containers" ("shipmentId", "container") VALUES (?, ?)`;

    console.log(`Inserting ${containers.length} containers for shipmentId ${shipmentId}`);

    for (const container of containers) {
        await conn.query(query, [shipmentId, container.container]);
    }
}

export async function replaceReceipts(conn: Connection, shipmentId: number, receipts: Array<{ receiptId: number }>): Promise<void> {
    await conn.query(`DELETE FROM ${SCHEMA}."Warehouse_Shipment_Receipts" WHERE "shipmentId" = ?`, [shipmentId]);

    if (!receipts || receipts.length === 0) {
        return;
    }

    const query = `INSERT INTO ${SCHEMA}."Warehouse_Shipment_Receipts" ("shipmentId", "receiptId") VALUES (?, ?)`;
    for (const receipt of receipts) {
        await conn.query(query, [shipmentId, receipt.receiptId]);
    }
}

export async function addReceiptToShipment(conn: Connection, shipmentId: number, receiptId: number): Promise<void> {
    await conn.query(
        `INSERT INTO ${SCHEMA}."Warehouse_Shipment_Receipts" ("shipmentId", "receiptId") VALUES (?, ?)`,
        [shipmentId, receiptId]
    );
}

export async function removeReceiptFromShipment(conn: Connection, shipmentId: number, receiptId: number): Promise<void> {
    await conn.query(
        `DELETE FROM ${SCHEMA}."Warehouse_Shipment_Receipts" WHERE "shipmentId" = ? AND "receiptId" = ?`,
        [shipmentId, receiptId]
    );
}

export async function getContainersByShipmentId(conn: Connection, shipmentId: number): Promise<any[]> {
    const query = `SELECT "containerId", "shipmentId", "container" 
    FROM ${SCHEMA}."Warehouse_Shipment_Containers" 
    WHERE "shipmentId" = ?`;
    return await conn.query(query, [shipmentId]) as any[];
}

export async function getReceiptsByShipmentId(conn: Connection, shipmentId: number): Promise<any[]> {
    const query = `SELECT wsr."shipmentReceiptId", wsr."shipmentId", wsr."receiptId" , wr."receiptNumber", wr."parentReceipt", wr."status", wr."piecesInland", wr."weightInland", wr."reWeight", wr."location"
    FROM ${SCHEMA}."Warehouse_Shipment_Receipts" as wsr 
    LEFT JOIN ${SCHEMA}."Warehouse_Receipt" as wr ON wsr."receiptId" = wr."receiptId"
    WHERE wsr."shipmentId" = ?`;
    const result = await conn.query(query, [shipmentId]) as any[];

    return result.map(row => ({
        ...row,
        shipmentReceiptId: row.shipmentReceiptId,
        shipmentId: row.shipmentId,
        receiptId: parseInt(row.receiptId),
        receiptNumber: parseInt(row.receiptNumber),
        parentReceipt: row.parentReceipt != null ? parseInt(row.parentReceipt) : null,
    }));
}


export async function checkShipmentUniqueFields(
    conn: Connection,
    { barcodeNumber }:
        { barcodeNumber?: string },
    terminalId?: number // optional, so we can exclude current record on update
): Promise<string | null> {
    const queries: string[] = [];
    const params: (string | number)[] = [];

    if (barcodeNumber) {
        const normalizedBarcode = String(barcodeNumber).trim();
        if (normalizedBarcode) {
            queries.push(`SELECT TRIM("barcodeNumber") AS "conflictField" FROM "${SCHEMA}"."Warehouse_Shipment" WHERE UPPER(TRIM("barcodeNumber")) = UPPER(?) AND "shipmentId" <> ?`);
            params.push(normalizedBarcode, terminalId ?? -1);
        }
    }

    if (queries.length === 0) return null;

    const query = queries.join(' UNION ALL ');

    const result = await conn.query(query, params) as { conflictField: string }[];

    return result.length ? result[0].conflictField : null;
}

export async function requestShipmentCompletion(conn: Connection, shipmentId: number, userId: number, completeStatus: string = 'REQUESTED'): Promise<void> {
    const query = `
        UPDATE ${SCHEMA}."Warehouse_Shipment"
        SET "completeStatus" = ?, "requestedBy" = ?, "requestedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), "updatedBy" = ?, "updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)
        WHERE "shipmentId" = ?
    `;

    await conn.query(query, [completeStatus, userId, userId, shipmentId]);
}

export async function approveShipmentCompletion(conn: Connection, shipmentId: number, userId: number, completeStatus: string = 'APPROVED'): Promise<void> {
    const query = `
        UPDATE ${SCHEMA}."Warehouse_Shipment"
        SET "completeStatus" = ?, "approvedBy" = ?, "approvedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), "updatedBy" = ?, "updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)
        WHERE "shipmentId" = ?
    `;

    await conn.query(query, [completeStatus, userId, userId, shipmentId]);
}

export async function revokeShipmentCompletion(conn: Connection, shipmentId: number, userId: number): Promise<void> {
    const query = `
        UPDATE ${SCHEMA}."Warehouse_Shipment"
        SET "completeStatus" = 'IDEAL',
            "isShipped" = 'N',
            "requestedBy" = NULL,
            "requestedAt" = NULL,
            "approvedBy" = NULL,
            "approvedAt" = NULL,
            "updatedBy" = ?,
            "updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE)
        WHERE "shipmentId" = ?
    `;

    await conn.query(query, [userId, shipmentId]);
}


export async function createShipmentPickupEntry(conn: Connection, payload: any, userId: number): Promise<any> {
    const query = `
        SELECT "pickupId" FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Shipment_Pickup_Entry"
            (
                "shipmentId", "barcodeNumber", "pickupDate", "contactName", "contactPhoneNumber",
                "customerId", "customerName", "stationId", "stationName", "billTo",
                "stationAddressLine1", "stationAddressLine2", "stationCity", "stationState",
                "stationZipCode", "stationPhoneNumber", "airlineCode", "airBillNumber", "hazmat",
                "pieces", "weight", "readyTime", "readyDate", "closeTime", "closeDate",
                "loTime", "loDate", "createdBy", "createdAt"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
        )
    `;

    const params = [
        payload.shipmentId, payload.barcodeNumber, payload.pickupDate, payload.contactName,
        payload.contactPhoneNumber, payload.customerId, payload.customerName, payload.stationId,
        payload.stationName, payload.billTo, payload.stationAddressLine1, payload.stationAddressLine2,
        payload.stationCity, payload.stationState, payload.stationZipCode, payload.stationPhoneNumber,
        payload.airlineCode, payload.airBillNumber, payload.hazmat, payload.pieces, payload.weight,
        payload.readyTime, payload.readyDate, payload.closeTime, payload.closeDate, payload.loTime,
        payload.loDate, payload.createdBy ?? userId,
    ];

    const result = await conn.query(query, params as any[]) as any[];
    const pickupId = result[0]?.pickupId;
    if (!pickupId) {
        throw new Error("Pickup entry could not be created");
    }

    return getShipmentPickupEntryById(conn, pickupId);
}

export async function getShipmentPickupEntryById(conn: Connection, pickupId: number): Promise<any | null> {
    const result = await conn.query(
        `SELECT * FROM ${SCHEMA}."Warehouse_Shipment_Pickup_Entry" WHERE "pickupId" = ?`,
        [pickupId]
    ) as any[];
    return result.length > 0 ? result[0] : null;
}
