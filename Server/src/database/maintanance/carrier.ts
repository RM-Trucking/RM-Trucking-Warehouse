import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';

export async function listCarriers(
    conn: Connection,
    searchTerm?: string
): Promise<{ carrierId: number; carrierName: string }[]> {
    let query = `SELECT "carrierId", "carrierName"
                 FROM ${SCHEMA}."Carrier"
                 WHERE UPPER("carrierStatus") IN ('ACTIVE', 'INCOMPLETE')`;
    const params: any[] = [];

    if (searchTerm && searchTerm.trim().length > 0) {
        query += ` AND LOWER("carrierName") LIKE ?`;
        params.push(`%${searchTerm.toLowerCase()}%`);
    }

    query += ` ORDER BY "carrierName" ASC`;

    const result = await conn.query(query, params) as any[];
    return result;
}


export async function createCarrierMinimal(
    conn: Connection,
    carrier: {
        carrierName: string;
        corporatePhoneNumber?: string;
        createdBy: number;
        entityId: number;
        noteThreadId?: number;
    }
): Promise<{ carrierId: number; carrierName: string }> {
    const insertQuery = `
    SELECT "carrierId", "carrierName"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Carrier"
      ("carrierName","corporatePhoneNumber", "carrierStatus",
       "createdAt","createdBy","entityId","noteThreadId")
      VALUES (?, ?, 'INCOMPLETE', (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), ?, ?, ?)
    )
  `;

    const params = [
        carrier.carrierName,
        carrier.corporatePhoneNumber ?? '',
        carrier.createdBy,
        carrier.entityId,
        carrier.noteThreadId ?? ''
    ];

    const result = (await conn.query(insertQuery, params as any[])) as any[];
    return {
        carrierId: result?.[0]?.carrierId,
        carrierName: result?.[0]?.carrierName
    };
}


export async function checkCarrierUniqueFields(
    conn: Connection,
    { carrierName }:
        { carrierName?: string },
    terminalId?: number // optional, so we can exclude current record on update
): Promise<string | null> {
    const queries: string[] = [];
    const params: (string | number)[] = [];

    if (carrierName) {
        queries.push(`SELECT "carrierName" AS "conflictField" FROM "${SCHEMA}"."Carrier" WHERE "carrierName" = ? AND "carrierId" <> ?`);
        params.push(carrierName, terminalId ?? -1);
    }

    if (queries.length === 0) return null;

    const query = queries.join(' UNION ALL ');

    const result = await conn.query(query, params) as { conflictField: string }[];

    console.log(result[0]);


    return result.length ? result[0].conflictField : null;
}
