import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as carrierService from '../../services/maintanance';


export async function createCarrier(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const createReq = req.body;
        const adminId = (req as any).user?.userId || 1;

        const { carrier } = await carrierService.createNewCarrier(conn, createReq, adminId);

        res.status(201).json({
            success: true,
            message: "Carrier created successfully",
            data: { carrier }
        });
    } catch (error: any) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function listCarrierDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || "";
        const carriers = await carrierService.listCarrierDropdownService(conn, search);
        res.status(200).json({ success: true, data: carriers });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function listParcelCarrierDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const search = (req.query.search as string) || "";
        const carriers = await carrierService.listParcelCarrierDropdownService(conn, search);
        res.status(200).json({ success: true, data: carriers });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}