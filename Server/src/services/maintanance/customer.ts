import { Connection } from 'odbc';
import * as customerDB from '../../database/maintanance';

export async function getCustomerDropdownService(conn: Connection, search: string) {
    return await customerDB.getCustomerDropdown(conn, search);
}