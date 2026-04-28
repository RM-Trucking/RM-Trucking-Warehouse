import { Request, Response } from "express";
import { Connection } from "odbc"; // adjust to your DB library
import * as enrouteService from "../../services/en-route";
import { CreateEnroutePayload } from "../../entities/en-route";

// 1. Create Enroute with multiple PROs
export async function createEnroute(req: Request, res: Response, conn: Connection): Promise<void> {
    try {

        const payload: CreateEnroutePayload = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        // Basic validation
        if (!payload.carrierId || !payload.customerId || !payload.stationId) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        const enrouteId = await enrouteService.createEnrouteWithPros(conn, payload, userId);
        res.status(201).json({ success: true, enrouteId });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// 2. List all Enroutes with PROs
export async function listEnroutes(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const searchTerm = req.query.searchTerm as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;

        const result = await enrouteService.listEnroutes(conn, { searchTerm, page, pageSize });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize
            }
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// 3. Verify PRO by carrier + proNumber (Comprehensive - checks Warehouse Receipt first, then En-Route)
export async function verifyPro(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const carrierId = req.query.carrierId as string | undefined;
        const proNumber = req.query.proNumber as string | undefined;

        if (!carrierId || !proNumber) {
            res.status(400).json({ success: false, message: "carrierId and proNumber are required" });
            return;
        }

        const result = await enrouteService.comprehensiveVerifyPro(conn, Number(carrierId), String(proNumber));
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
}
