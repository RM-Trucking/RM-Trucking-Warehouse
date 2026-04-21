import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as customerService from '../../services/maintanance';



export async function getCustomerDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || ""; // user types into autocomplete

        console.log(`Fetching customer dropdown with search: "${search}"`);

        const dropdownData = await customerService.getCustomerDropdownService(conn, search);
        res.status(200).json({ success: true, data: dropdownData });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            error: "Failed to fetch dropdown data",
            message: (error as Error).message
        });
    }
}