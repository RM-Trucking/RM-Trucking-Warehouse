import { Connection } from 'odbc';
import * as carrierDB from '../../database/maintanance';

export async function listCarrierDropdownService(
    conn: Connection,
    searchTerm?: string
): Promise<{ carrierId: number; carrierName: string }[]> {
    return await carrierDB.listCarriers(conn, searchTerm);
}
