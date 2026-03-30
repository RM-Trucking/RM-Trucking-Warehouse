import { Request, Response } from "express";
import { Connection } from "odbc"; // adjust to your DB library
import * as enrouteService from "../../services/en-route";
import { CreateEnroutePayload } from "../../entities/en-route";

// 1. Create Enroute with multiple PROs
export async function createEnroute(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const payload: CreateEnroutePayload = req.body;

        // Basic validation
        if (!payload.carrierId || !payload.customerId || !payload.stationId || !payload.createdBy) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        const enrouteId = await enrouteService.createEnrouteWithPros(conn, payload);
        res.status(201).json({ success: true, enrouteId });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 2. List all Enroutes with PROs
export async function listEnroutes(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const enroutes = await enrouteService.listEnroutes(conn);
        res.status(200).json({ success: true, data: enroutes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// 3. Verify PRO by carrier + proNumber
export async function verifyPro(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { carrierId, proNumber } = req.query;

        if (!carrierId || !proNumber) {
            res.status(400).json({ success: false, message: "carrierId and proNumber are required" });
            return;
        }

        const result = await enrouteService.verifyPro(conn, Number(carrierId), String(proNumber));
        if (!result) {
            res.status(404).json({ success: false, message: "PRO not found for given carrier" });
            return;
        }

        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}
