import { Connection } from "odbc";
import { CreateIDVerification, Driver, IDVerification, IDVerificationProDetail } from "../../entities/id-verification";
import { SCHEMA } from "../../config/db2";


/**
 * DRIVER QUERIES
 */
export async function createDriver(conn: Connection, driver: Omit<Driver, "driverId">): Promise<number> {
    const query = `
        SELECT "driverId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Driver"
            ("driverName","signaturePath")
            VALUES (?, ?)
        )`;
    const result = await conn.query(query, [driver.driverName, driver.driverSignature ?? ""]) as any[];
    return parseInt(result[0].driverId);
}

export async function getDriverById(
    conn: Connection,
    driverId: number
): Promise<Driver | null> {
    const query = `SELECT * FROM ${SCHEMA}."Driver" WHERE "driverId" = ?`;
    const result = await conn.query(query, [driverId]) as any[];
    if (!result[0]) return null;

    // Normalize BigInt fields
    return {
        ...result[0],
        driverId: parseInt(result[0].driverId),
    };
}

/**
 * ID_VERIFICATION QUERIES
 */
export async function createIDVerification(
    conn: Connection,
    data: CreateIDVerification,
): Promise<number> {

    const query = `
    SELECT "verificationId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."ID_Verification"
        ("carrierId","customerId","stationId","doorNo","firstIdType","firstIdPhotoMatch",
         "secondIdType","secondIdPhotoMatch","driverId",
         "verifiedByEmployee","toEmails","createdAt","createdBy")
      VALUES (?,?,?,?,?,?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?)
    )
  `;

    const params = [
        Number(data.carrierId),
        Number(data.customerId),
        Number(data.stationId),
        data.doorNo ?? null,
        data.firstIdType ?? null,
        data.firstIdPhotoMatch ?? 'N',
        data.secondIdType ?? null,
        data.secondIdPhotoMatch ?? 'N',
        Number(data.driverId),
        data.verifiedByEmployee ?? null,
        data.toEmails ? JSON.stringify(data.toEmails) : null,
        Number(data.createdBy)
    ];

    const result = await conn.query(query, params as any[]) as any[];
    return parseInt(result[0].verificationId);
}

export async function getIDVerificationById(
    conn: Connection,
    id: number
): Promise<IDVerification | null> {
    const query = `
    SELECT v.*,
           c."carrierName",
           cu."customerName",
           s."stationName"
    FROM ${SCHEMA}."ID_Verification" v
    LEFT JOIN ${SCHEMA}."Carrier" c ON v."carrierId" = c."carrierId"
    LEFT JOIN ${SCHEMA}."Customer" cu ON v."customerId" = cu."customerId"
    LEFT JOIN ${SCHEMA}."Station" s ON v."stationId" = s."stationId"
    WHERE v."verificationId" = ?
  `;

    const result = await conn.query(query, [Number(id)]) as any[];
    if (!result.length) return null;

    return {
        ...result[0],
        driverId: parseInt(result[0].driverId),
        verificationId: parseInt(result[0].verificationId),
        toEmails: result[0].toEmails ? JSON.parse(result[0].toEmails) : [],
        carrierName: result[0].carrierName,
        customerName: result[0].customerName,
        stationName: result[0].stationName
    };
}


export async function listIDVerifications(conn: Connection, limit: number, offset: number): Promise<IDVerification[]> {
    const query = `SELECT * FROM ${SCHEMA}."ID_Verification" ORDER BY "verificationId" DESC LIMIT ? OFFSET ?`;
    const result = await conn.query(query, [limit, offset]) as IDVerification[];
    return result.map((row: any) => ({
        ...row,
        driverId: parseInt(row.driverId),
        verificationId: parseInt(row.verificationId),
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : []
    }));

}

/**
 * LIST ID VERIFICATIONS WITH FILTERS AND PAGINATION
 * @param filterLogic - "AND" (all filters must match) or "OR" (any filter matches). Default: "AND"
 */
export async function listIDVerificationsWithFilters(
    conn: Connection,
    limit: number,
    offset: number,
    filters?: {
        driverId?: number;
        carrierName?: string;
        customerName?: string;
        stationName?: string;
        driverName?: string;
        startDate?: Date;
        endDate?: Date;
    },
    filterLogic: "AND" | "OR" = "AND"
): Promise<IDVerification[]> {
    let query = `
        SELECT DISTINCT iv.* , c."carrierName", cu."customerName", s."stationName"
        FROM ${SCHEMA}."ID_Verification" iv
        LEFT JOIN ${SCHEMA}."Carrier" c ON iv."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON iv."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON iv."stationId" = s."stationId"
        WHERE 1=1
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    // Build filter conditions
    if (filters?.driverId) {
        conditions.push(`iv."driverId" = ?`);
        params.push(filters.driverId);
    }
    if (filters?.carrierName) {
        conditions.push(`c."carrierName" LIKE ?`);
        params.push(`%${filters.carrierName}%`);
    }
    if (filters?.customerName) {
        conditions.push(`cu."customerName" LIKE ?`);
        params.push(`%${filters.customerName}%`);
    }
    if (filters?.stationName) {
        conditions.push(`s."stationName" LIKE ?`);
        params.push(`%${filters.stationName}%`);
    }
    if (filters?.startDate) {
        conditions.push(`iv."createdAt" >= ?`);
        params.push(filters.startDate);
    }
    if (filters?.endDate) {
        conditions.push(`iv."createdAt" <= ?`);
        params.push(filters.endDate);
    }

    // Apply filter logic (AND or OR)
    if (conditions.length > 0) {
        const operator = filterLogic === "OR" ? " OR " : " AND ";
        query += ` AND (${conditions.join(operator)})`;
    }

    query += ` ORDER BY iv."verificationId" DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await conn.query(query, params) as IDVerification[];
    return result.map((row: any) => ({
        ...row,
        driverId: parseInt(row.driverId),
        verificationId: parseInt(row.verificationId),
        toEmails: row.toEmails ? JSON.parse(row.toEmails) : []
    }));
}

/**
 * COUNT ID VERIFICATIONS WITH FILTERS
 * @param filterLogic - "AND" (all filters must match) or "OR" (any filter matches). Default: "AND"
 */
export async function countIDVerifications(
    conn: Connection,
    filters?: {
        driverId?: number;
        carrierName?: string;
        customerName?: string;
        stationName?: string;
        driverName?: string;
        startDate?: Date;
        endDate?: Date;
    },
    filterLogic: "AND" | "OR" = "AND"
): Promise<number> {
    let query = `
        SELECT COUNT(DISTINCT iv."verificationId") as "total" 
        FROM ${SCHEMA}."ID_Verification" iv
        LEFT JOIN ${SCHEMA}."Carrier" c ON iv."carrierId" = c."carrierId"
        LEFT JOIN ${SCHEMA}."Customer" cu ON iv."customerId" = cu."customerId"
        LEFT JOIN ${SCHEMA}."Station" s ON iv."stationId" = s."stationId"
        WHERE 1=1
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    // Build filter conditions
    if (filters?.driverId) {
        conditions.push(`iv."driverId" = ?`);
        params.push(filters.driverId);
    }
    if (filters?.carrierName) {
        conditions.push(`c."carrierName" LIKE ?`);
        params.push(`%${filters.carrierName}%`);
    }
    if (filters?.customerName) {
        conditions.push(`cu."customerName" LIKE ?`);
        params.push(`%${filters.customerName}%`);
    }
    if (filters?.stationName) {
        conditions.push(`s."stationName" LIKE ?`);
        params.push(`%${filters.stationName}%`);
    }
    if (filters?.startDate) {
        conditions.push(`iv."createdAt" >= ?`);
        params.push(filters.startDate);
    }
    if (filters?.endDate) {
        conditions.push(`iv."createdAt" <= ?`);
        params.push(filters.endDate);
    }

    // Apply filter logic (AND or OR)
    if (conditions.length > 0) {
        const operator = filterLogic === "OR" ? " OR " : " AND ";
        query += ` AND (${conditions.join(operator)})`;
    }

    const result = await conn.query(query, params) as any[];
    return result[0]?.total || 0;
}

/**
 * PRO DETAIL QUERIES
 */
export async function createProDetail(conn: Connection, detail: Omit<IDVerificationProDetail, "proDetailId">): Promise<number> {
    const query = `
        SELECT "proDetailId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."ID_Verification_Pro_Detail"
            ("verificationId","pieces","weight","shipper","proNumber")
            VALUES (?,?,?,?,?)
        )`;

    const params = [Number(detail.verificationId), detail.pieces, detail.weight, detail.shipper, detail.proNumber];
    const result = await conn.query(query, params) as any[];
    return result[0].proDetailId;
}

export async function getProDetailsByVerification(conn: Connection, verificationId: number): Promise<IDVerificationProDetail[]> {
    const query = `SELECT * FROM ${SCHEMA}."ID_Verification_Pro_Detail" WHERE "verificationId" = ?`;
    const result = await conn.query(query, [Number(verificationId)]) as IDVerificationProDetail[];
    return result.map((row: any) => ({
        ...row,
        proDetailId: parseInt(row.proDetailId),
        verificationId: parseInt(row.verificationId),
    }));
}

/**
 * CHECK DUPLICATE CARRIER + PRO NUMBER IN ID VERIFICATION WITH STATUS
 */
export async function checkDuplicateCarrierProInVerification(conn: Connection, carrierId: number, proNumber: string): Promise<boolean> {

    const query = `
        SELECT COUNT(*) as "count" FROM ${SCHEMA}."ID_Verification" iv
        INNER JOIN ${SCHEMA}."ID_Verification_Pro_Detail" ivpd ON iv."verificationId" = ivpd."verificationId"
        WHERE iv."carrierId" = ? AND ivpd."proNumber" = ?
    `;
    const result = await conn.query(query, [carrierId, proNumber]) as any[];

    return result[0].count > 0;
}

/**
 * GET DUPLICATE CARRIER + PRO WITH STATUS (for validation with REJECTED check)
 */
export async function getDuplicateCarrierProWithStatus(conn: Connection, carrierId: number, proNumber: string): Promise<{ receiptId: number; status: string } | null> {
    const query = `
        SELECT wr."receiptId", wr."status"
        FROM ${SCHEMA}."Warehouse_Receipt" wr
        WHERE wr."carrierId" = ? AND wr."proNumber" = ?
        ORDER BY wr."receiptId" DESC
        LIMIT 1
    `;
    const result = await conn.query(query, [carrierId, proNumber]) as any[];

    if (result.length === 0) return null;

    return {
        receiptId: parseInt(result[0].receiptId),
        status: result[0].status
    };
}
