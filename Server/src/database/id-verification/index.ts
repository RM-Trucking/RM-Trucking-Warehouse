import { Connection } from "odbc";
import { Driver, IDVerification, IDVerificationProDetail } from "../../entities/id-verification";
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
    const result = await conn.query(query, [driver.driverName, driver.signaturePath ?? ""]) as any[];
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
    data: Omit<IDVerification, "verificationId" | "createdAt">,
): Promise<number> {

    const query = `
    SELECT "verificationId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."ID_Verification"
        ("carrierId","doorNo","firstIdType","firstIdPhotoMatch",
         "secondIdType","secondIdPhotoMatch","driverId",
         "shipperCompanyName","verifiedByEmployee","createdAt","createdBy")
      VALUES (?,?,?,?,?,?,?,?,?,(CURRENT_TIMESTAMP - CURRENT_TIMEZONE),?)
    )
  `;

    const params = [
        Number(data.carrierId),
        data.doorNo ?? null,
        data.firstIdType ?? null,
        data.firstIdPhotoMatch ?? 'N',
        data.secondIdType ?? null,
        data.secondIdPhotoMatch ?? 'N',
        Number(data.driverId),
        data.shipperCompanyName ?? null,
        data.verifiedByEmployee ?? null,
        Number(data.createdBy)
    ];

    const result = await conn.query(query, params as any[]) as any[];
    return parseInt(result[0].verificationId);
}

export async function getIDVerificationById(conn: Connection, id: number): Promise<IDVerification | null> {
    const query = `SELECT * FROM ${SCHEMA}."ID_Verification" WHERE "verificationId" = ?`;
    const result = await conn.query(query, [Number(id)]) as any[];
    return {
        ...result[0],
        driverId: parseInt(result[0].driverId),
        verificationId: parseInt(result[0].verificationId)
    };
}

export async function listIDVerifications(conn: Connection, limit: number, offset: number): Promise<IDVerification[]> {
    const query = `SELECT * FROM ${SCHEMA}."ID_Verification" ORDER BY "verificationId" DESC LIMIT ? OFFSET ?`;
    return await conn.query(query, [limit, offset]) as IDVerification[];
}

/**
 * PRO DETAIL QUERIES
 */
export async function createProDetail(conn: Connection, detail: Omit<IDVerificationProDetail, "proDetailId">): Promise<number> {
    const query = `
        SELECT "proDetailId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."ID_Verification_Pro_Detail"
            ("verificationId","customerId","stationId","pieces","weight","shipper","proNumber")
            VALUES (?,?,?,?,?,?,?)
        )`;

    const params = [Number(detail.verificationId), Number(detail.customerId), Number(detail.stationId), detail.pieces, detail.weight, detail.shipper, detail.proNumber];
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
 * CHECK DUPLICATE CARRIER + PRO NUMBER IN ID VERIFICATION
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
