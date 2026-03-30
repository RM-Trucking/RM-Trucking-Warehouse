import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as carrierService from '../../services/maintanance';

export async function listCarrierDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || "";
        const carriers = await carrierService.listCarrierDropdownService(conn, search);
        res.status(200).json({ success: true, data: carriers });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}
