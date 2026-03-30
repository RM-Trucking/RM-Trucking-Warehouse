import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';

export async function getCustomerDropdown(
    conn: Connection,
    search: string
): Promise<{ stationId: number; stationName: string; customerId: number; customerName: string }[]> {
    let query = `
    SELECT s."stationId", s."stationName", c."customerId", c."customerName"
    FROM ${SCHEMA}."Station" s
    JOIN ${SCHEMA}."Customer" c ON s."customerId" = c."customerId"
    WHERE c."activeStatus" = 'Y'
  `;
    const params: any[] = [];

    if (search && search.trim().length > 0) {
        query += ` AND LOWER(s."stationName") LIKE ?`;
        params.push(`%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY s."stationName" ASC`;

    const result = await conn.query(query, params) as any[];
    return result;
}

