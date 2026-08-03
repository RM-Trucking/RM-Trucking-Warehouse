import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as airlineService from '../../services/maintanance';

export async function listExportAirlinesDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || "";
        // service currently ignores search but accepts it for future use
        const airlines = await airlineService.listExportAirlinesDropdownService(conn, search);
        res.status(200).json({ success: true, data: airlines });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
}
