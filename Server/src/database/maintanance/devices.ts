import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';


export async function getCargoAPIDropdown(conn: Connection): Promise<{ apiId: number; apiName: string }[]> {
    const query = `
        SELECT "apiId", "apiName"
        FROM ${SCHEMA}."Cargo_API"
        WHERE "activeStatus" = 'Y'
        ORDER BY "apiName"
    `;
    const result = (await conn.query(query)) as any[];
    return result;
}

export async function getCargoAPIById(conn: Connection, apiId: number): Promise<{ apiId: number; apiName: string; apiEndPoint: string; apiKey: string; activeStatus: string } | null> {
    const query = `
        SELECT "apiId", "apiName", "apiEndPoint", "apiKey", "activeStatus"
        FROM ${SCHEMA}."Cargo_API"
        WHERE "activeStatus" = 'Y' AND "apiId" = ?
    `;
    const result = (await conn.query(query, [apiId])) as any[];
    return result.length > 0 ? result[0] : null;
}

export async function getPrintersDropdown(conn: Connection): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
    const query = `
        SELECT "printerId", "printerName", "printerIP", "printerPort"
        FROM ${SCHEMA}."Printers"
        WHERE "activeStatus" = 'Y'
        ORDER BY "printerName"
    `;
    const result = (await conn.query(query)) as any[];
    return result;
}