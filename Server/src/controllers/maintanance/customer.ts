import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as customerService from '../../services/maintanance';



export async function getCustomerWithStationDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || ""; // user types into autocomplete

        console.log(`Fetching customer dropdown with search: "${search}"`);

        const dropdownData = await customerService.getCustomerWithStationDropdownService(conn, search);
        res.status(200).json({ success: true, data: dropdownData });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            error: "Failed to fetch dropdown data",
            message: (error as Error).message
        });
    }
}


export async function getCustomerDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || ""; // user types into autocomplete

        console.log(`Fetching customer dropdown with search: "${search}"`);

        const dropdownData = await customerService.getCustomerDropdown(conn, search);
        res.status(200).json({ success: true, data: dropdownData });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            error: "Failed to fetch dropdown data",
            message: (error as Error).message
        });
    }
}

export async function getStationDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || ""; // user types into autocomplete
        const customerId = Number(req.query.customerId)

        if (!customerId)
            res.status(400).json({ error: 'Missing required fields' });

        const dropdownData = await customerService.getStationDropdown(conn, customerId, search);
        res.status(200).json({ success: true, data: dropdownData });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            error: "Failed to fetch dropdown data",
            message: (error as Error).message
        });
    }
}
