import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';


export async function listExportAirlinesDropdown(
    conn: Connection,
    search?: string
): Promise<any[]> {
    let query = `SELECT * 
    FROM ${SCHEMA}."Airline" 
    WHERE "scenarioType" = 'EXPORT'`;

    if (search) {
        query += ` AND "airlineName" LIKE '%${search}%' OR "airlineCode" LIKE '%${search}%' OR "airlineNumber" LIKE '%${search}%'`;
    }


    return await conn.query(query) as any[];
}
