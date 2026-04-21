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
        query += ` AND LOWER(c."customerName") LIKE ?`;
        params.push(`%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY c."customerName" ASC`;

    const result = await conn.query(query, params) as any[];
    return result;
}

export async function getDepartmentAndPersonnelEmails(
    conn: Connection,
    stationId: number
): Promise<{
    entryId: number;
    entryType: "Department" | "Personnel";
    entryEmail: string;
}[]> {
    let query = `
    SELECT DISTINCT d."departmentId" AS "entryId",
           'Department' AS "entryType",
           d."email" AS "entryEmail"
    FROM ${SCHEMA}."Department" d
    WHERE d."stationId" = ?
      AND d."activeStatus" = 'Y'
      AND d."email" IS NOT NULL

    UNION

    SELECT DISTINCT p."personnelId" AS "entryId",
           'Personnel' AS "entryType",
           p."email" AS "entryEmail"
    FROM ${SCHEMA}."Customer_Personnel" p
    JOIN ${SCHEMA}."Department" d ON p."departmentId" = d."departmentId"
    WHERE d."stationId" = ?
      AND d."activeStatus" = 'Y'
      AND p."activeStatus" = 'Y'
      AND p."email" IS NOT NULL

    ORDER BY "entryType", "entryEmail"
    `;

    const params: any[] = [stationId, stationId];

    const result = await conn.query(query, params) as any[];
    return result;
}
