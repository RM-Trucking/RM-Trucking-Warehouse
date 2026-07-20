import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';

export async function getCustomerWithStationDropdown(
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

export async function getStationDefaultEmails(conn: Connection, stationId: number): Promise<{ hasDefaultEmails: 'Y' | 'N', emails: string[] }> {

    let query = `
    SELECT "warehouseEmails" AS "emails"
    FROM ${SCHEMA}."Station"
    WHERE "stationId" = ?
    `;
    const params: any[] = [stationId];

    const result = await conn.query(query, params) as any[];
    if (result.length > 0) {
        const emails = result[0].emails;
        return {
            hasDefaultEmails: JSON.parse(emails)?.length > 0 ? 'Y' : 'N',
            emails: emails ? JSON.parse(emails) : []
        };
    }
    return {
        hasDefaultEmails: 'N',
        emails: []
    };

}

export async function getStationByRmAccountNumber(
    conn: Connection,
    rmAccountNumber: string
): Promise<{ stationId: number; stationName: string; customerId: number; customerName: string } | null> {
    const query = `
    SELECT s."stationId", s."stationName", c."customerId", c."customerName"
    FROM ${SCHEMA}."Station" s
    JOIN ${SCHEMA}."Customer" c ON s."customerId" = c."customerId"
    WHERE UPPER(s."rmAccountNumber") = UPPER(?)
      AND s."activeStatus" = 'Y'
      AND c."activeStatus" = 'Y'
    `;

    const result = (await conn.query(query, [rmAccountNumber])) as any[];
    return result.length > 0 ? result[0] : null;
}


export async function getStationRateDetails(
    conn: Connection,
    stationId: number
): Promise<{
    rateId: number;
    customerRateId: number;
    minRate: number;
    maxRate: number;
    baseRate: number;
    department: string;
    warehouse: string;
} | null> {
    const query = `
    SELECT 
      "crw"."rateId", 
      "crw"."customerRateId", 
      "crw"."minRate", 
      "crw"."maxRate", 
      "crw"."ratePerPound" AS "baseRate", 
      "crw"."department", 
      "crw"."warehouse"
    FROM ${SCHEMA}."Customer_Rate_Warehouse" "crw"
    LEFT JOIN ${SCHEMA}."Station_Rate_Map" "srm" 
      ON "srm"."rateType" = 'WAREHOUSE' 
      AND "crw"."rateId" = "srm"."rateId" 
    WHERE "srm"."stationId" = ?
  `;

    const result = await conn.query(query, [stationId]) as any[];
    return result.length > 0 ? result[0] : null;
}

export async function getCustomerDropdown(conn: Connection, search: string, getAll: boolean): Promise<{ customerId: number; customerName: string }[]> {

    let query = `
    SELECT "customerId", "customerName"
    FROM ${SCHEMA}."Customer"
    WHERE 1=1
    `
    const params: any[] = [];

    if (getAll === false) {
        query += ` AND "activeStatus" = ?`;
        params.push('Y');
    }

    if (getAll === true) {
        query += ` AND "activeStatus" IN (?, ?)`;
        params.push('Y', 'N');
    }

    if (search && search.trim().length > 0) {
        query += ` AND LOWER("customerName") LIKE ?`;
        params.push(`%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY "customerName" ASC`;

    const result = await conn.query(query, params) as any[];
    return result;

}

export async function getStationDropdown(conn: Connection, customerId: number, search: string, getAll: boolean): Promise<{ stationId: number; stationName: string }[]> {

    let query = `
    SELECT "stationId", "stationName"
    FROM ${SCHEMA}."Station"
    WHERE "customerId" = ${customerId}
    `
    const params: any[] = [];

    if (getAll === false) {
        query += ` AND "activeStatus" = ?`;
        params.push('Y');
    }

    if (getAll === true) {
        query += ` AND "activeStatus" IN (?, ?)`;
        params.push('Y', 'N');
    }

    if (search && search.trim().length > 0) {
        query += ` AND LOWER("stationName") LIKE ?`;
        params.push(`%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY "stationName" ASC`;

    const result = await conn.query(query, params) as any[];
    return result;

}
