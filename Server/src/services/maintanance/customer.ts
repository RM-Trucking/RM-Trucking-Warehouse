import { Connection } from 'odbc';
import * as customerDB from '../../database/maintanance';

export async function getCustomerWithStationDropdownService(
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
    const stations = await customerDB.getCustomerWithStationDropdown(conn, search);

    // Step 2: For each station, fetch deduplicated emails
    const enrichedResult = await Promise.all(
        stations.map(async (station) => {
            const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, station.stationId);

            const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, station.stationId);

            return {
                ...station,
                emails, // already deduplicated by query
                stationDefaultEmails
            };
        })
    );

    return enrichedResult;
}

export async function getCustomerDropdown(conn: Connection, search: string): Promise<{ customerId: number, customerName: string }[]> {
    const customers = await customerDB.getCustomerDropdown(conn, search)
    return customers;
}

export async function getStationDropdown(conn: Connection, customerId: number, search: string): Promise<{ stationId: number, stationName: string }[]> {
    const customers = await customerDB.getStationDropdown(conn, customerId, search)
    return customers;
}