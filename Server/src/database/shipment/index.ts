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
                "updatedAt",
                "updatedBy",
                "isCanceled",
                "isShipped",
                "isScanned",
                "pickupEntry",
                "pickupEntryNumber"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?, ?, ?, ?, ?)
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
        payload.updatedBy ?? userId,
        "N",
        "N",
        "N",
        "N",
        null,
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
    fields.push(`"updatedBy" = ?`);
    params.push(userId);
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
        SELECT
            "shipmentId",
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
            "updatedAt",
            "updatedBy",
            "isCanceled",
            "isShipped",
            "isScanned",
            "pickupEntry",
            "pickupEntryNumber"
        FROM ${SCHEMA}."Warehouse_Shipment"
        WHERE "shipmentId" = ?
    `;

    const result = await conn.query(query, [shipmentId]) as any[];
    return result.length > 0 ? result[0] : null;
}

export async function listShipments(conn: Connection, filters: { searchTerm?: string; page?: number; pageSize?: number }): Promise<any[]> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let query = `
        SELECT
            "shipmentId",
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
            "updatedAt",
            "updatedBy",
            "isCanceled",
            "isShipped",
            "isScanned",
            "pickupEntry",
            "pickupEntryNumber"
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

    query += ` ORDER BY "shipmentId" DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return await conn.query(query, params as any) as any[];
}

export async function countShipments(conn: Connection, filters: { searchTerm?: string }): Promise<number> {
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

    const result = await conn.query(query, params as any) as any[];
    return parseInt(result[0].total, 10);
}

export async function replaceContainers(conn: Connection, shipmentId: number, containers: Array<{ container: string }>): Promise<void> {
    await conn.query(`DELETE FROM ${SCHEMA}."Warehouse_Shipment_Containers" WHERE "shipmentId" = ?`, [shipmentId]);

    if (!containers || containers.length === 0) {
        return;
    }

    const query = `INSERT INTO ${SCHEMA}."Warehouse_Shipment_Containers" ("shipmentId", "container") VALUES (?, ?)`;
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

export async function getContainersByShipmentId(conn: Connection, shipmentId: number): Promise<any[]> {
    const query = `SELECT "containerId", "shipmentId", "container" FROM ${SCHEMA}."Warehouse_Shipment_Containers" WHERE "shipmentId" = ?`;
    return await conn.query(query, [shipmentId]) as any[];
}

export async function getReceiptsByShipmentId(conn: Connection, shipmentId: number): Promise<any[]> {
    const query = `SELECT "shipmentReceiptId", "shipmentId", "receiptId" FROM ${SCHEMA}."Warehouse_Shipment_Receipts" WHERE "shipmentId" = ?`;
    return await conn.query(query, [shipmentId]) as any[];
}
