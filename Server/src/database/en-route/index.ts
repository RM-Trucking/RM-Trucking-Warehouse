import { Connection } from "odbc";
import { SCHEMA } from "../../config/db2";

// 1. Create Enroute record
export async function createEnroute(
    conn: Connection,
    carrierId: number,
    customerId: number,
    stationId: number,
    estimatedDate: string | null,
    shippedDate: string | null,
    toEmails: string | null,
    createdBy: number
): Promise<any> {
    const query = `
        SELECT "enrouteId" FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."En_Route"
            ("carrierId", "customerId", "stationId", "estimatedDate", "shippedDate", "toEmails", "createdAt", "createdBy")
            VALUES (?, ?, ?, ?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?)
        )
    `;
    const params = [carrierId, customerId, stationId, estimatedDate, shippedDate, toEmails, createdBy];
    const result = await conn.query(query, params as any) as any[];
    return result[0].enrouteId; // returns the full inserted row
}


// 2. Insert multiple PRO details for an Enroute
export async function addProDetails(
    conn: Connection,
    enrouteId: number,
    pros: { proNumber: string; pieces: number; weight: number; shipper: string; activeStatus?: string }[]
): Promise<void> {
    const query = `
        INSERT INTO ${SCHEMA}."En_Route_Pro_Detail"
        ("enrouteId", "proNumber", "pieces", "weight", "shipper", "activeStatus")
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    for (const pro of pros) {
        const params = [
            enrouteId,
            pro.proNumber,
            pro.pieces,
            pro.weight,
            pro.shipper,
            pro.activeStatus || "Y"
        ];
        await conn.query(query, params);
    }
}

// 3. Get all Enroutes with PROs (including carrier, customer, station names)
export async function listEnroutes(
    conn: Connection,
    filters: { searchTerm?: string; page?: number; pageSize?: number }
): Promise<any[]> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let query = `
        SELECT e."enrouteId", e."estimatedDate", e."shippedDate", e."createdAt", e."createdBy", e."toEmails",
               c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."En_Route" e
        JOIN ${SCHEMA}."Carrier" c ON e."carrierId" = c."carrierId"
        JOIN ${SCHEMA}."Customer" cu ON e."customerId" = cu."customerId"
        JOIN ${SCHEMA}."Station" s ON e."stationId" = s."stationId"
    `;

    const values: any[] = [];
    if (filters.searchTerm) {
        const term = `%${filters.searchTerm.toUpperCase()}%`;
        query += ` WHERE UPPER(c."carrierName") LIKE ?
                   OR UPPER(cu."customerName") LIKE ?
                   OR UPPER(s."stationName") LIKE ?`;
        values.push(term, term, term);
    }

    query += ` ORDER BY e."enrouteId" DESC LIMIT ? OFFSET ?`;
    values.push(pageSize, offset);

    return await conn.query(query, values) as any[];
}

export async function getProsByEnrouteId(
    conn: Connection,
    enrouteId: number
): Promise<any[]> {
    const query = `
        SELECT p."proDetailId", p."enrouteId", p."proNumber", p."pieces", p."weight", p."shipper", p."activeStatus"
        FROM ${SCHEMA}."En_Route_Pro_Detail" p
        WHERE p."enrouteId" = ?
    `;
    return await conn.query(query, [enrouteId]) as any[];
}

export async function countEnroutes(
    conn: Connection,
    filters: { searchTerm?: string }
): Promise<number> {
    let query = `
        SELECT COUNT(*) AS "total"
        FROM ${SCHEMA}."En_Route" e
        JOIN ${SCHEMA}."Carrier" c ON e."carrierId" = c."carrierId"
        JOIN ${SCHEMA}."Customer" cu ON e."customerId" = cu."customerId"
        JOIN ${SCHEMA}."Station" s ON e."stationId" = s."stationId"
    `;

    const values: any[] = [];
    if (filters.searchTerm) {
        const upperTerm = `%${filters.searchTerm.toUpperCase()}%`;
        query += ` WHERE UPPER(c."carrierName") LIKE ? 
                    OR UPPER(cu."customerName") LIKE ? 
                    OR UPPER(s."stationName") LIKE ?`;
        const term = `%${upperTerm}%`;
        values.push(term, term, term);
    }

    const result = await conn.query(query, values) as any[];
    return parseInt(result[0].total, 10);
}


// 4. Verify PRO by carrier + proNumber
export async function verifyPro(
    conn: Connection,
    carrierId: number,
    proNumber: string
): Promise<any | null> {
    const query = `
        SELECT p."proDetailId", p."proNumber", p."pieces", p."weight", p."shipper", p."activeStatus",
               e."enrouteId", e."toEmails",
               c."carrierId", c."carrierName",
               cu."customerId", cu."customerName",
               s."stationId", s."stationName"
        FROM ${SCHEMA}."En_Route_Pro_Detail" p
        JOIN ${SCHEMA}."En_Route" e ON p."enrouteId" = e."enrouteId"
        JOIN ${SCHEMA}."Carrier" c ON e."carrierId" = c."carrierId"
        JOIN ${SCHEMA}."Customer" cu ON e."customerId" = cu."customerId"
        JOIN ${SCHEMA}."Station" s ON e."stationId" = s."stationId"
        WHERE e."carrierId" = ? AND p."proNumber" = ?
    `;
    const params = [carrierId, proNumber];
    const result = await conn.query(query, params) as any[];
    return result.length > 0 ? result[0] : null;
}

// Inactivate a PRO after ID verification
export async function inactivatePro(
    conn: Connection,
    proDetailId: number
): Promise<void> {
    const query = `
        UPDATE ${SCHEMA}."En_Route_Pro_Detail"
        SET "activeStatus" = 'N'
        WHERE "proDetailId" = ?
    `;
    const params = [proDetailId];
    await conn.query(query, params);
}
