import { Connection } from 'odbc';
import * as customerDB from '../../database/maintanance';

export async function getCustomerDropdownService(
    conn: Connection,
    search: string
): Promise<{
    stationId: number;
    stationName: string;
    customerId: number;
    customerName: string;
    emails: {
        entryId: number;
        entryType: "Department" | "Personnel";
        entryEmail: string;
    }[];
}[]> {
    // Step 1: Get customer + station list
    const stations = await customerDB.getCustomerDropdown(conn, search);

    // Step 2: For each station, fetch deduplicated emails
    const enrichedResult = await Promise.all(
        stations.map(async (station) => {
            const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, station.stationId);

            return {
                ...station,
                emails, // already deduplicated by query
            };
        })
    );

    return enrichedResult;
}
