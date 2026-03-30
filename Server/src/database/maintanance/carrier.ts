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
