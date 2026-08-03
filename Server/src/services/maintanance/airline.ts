import { Connection } from 'odbc';
import * as airlineDB from '../../database/maintanance/airline';

export async function listExportAirlinesDropdownService(conn: Connection, search?: string): Promise<{ airlineId: number; airlineName: string; iataCode?: string }[]> {
    const rows = await airlineDB.listExportAirlinesDropdown(conn, search);
    // normalize/shape as needed by frontend
    return rows;
}

export default {};
