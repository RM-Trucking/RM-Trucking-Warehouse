import { Request, Response } from "express";
import { Connection } from "odbc";
import * as shipmentService from "../../services/shipment";
import { CreateWarehouseShipment, UpdateWarehouseShipment } from "../../entities/shipment";

export async function createShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const payload = req.body as CreateWarehouseShipment;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!payload.shipmentType || !payload.barcodeNumber || !payload.customerId || !payload.stationId || !payload.consigneeId || payload.pieces === undefined || payload.weight === undefined) {
            res.status(400).json({ success: false, message: "shipmentType, barcodeNumber, customerId, stationId, consigneeId, pieces and weight are required" });
            return;
        }

        const shipment = await shipmentService.createShipmentWithRelations(conn, payload, userId);
        res.status(201).json({ success: true, message: "Shipment created successfully", data: shipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" || error?.message?.toLowerCase().includes("duplicate") ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to create shipment" });
    }
}

export async function listShipments(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const searchTerm = req.query.searchTerm as string | undefined;
        const page = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
        const scanned = req.query.scanned as string | undefined;
        const pickup = req.query.pickup as string | undefined;
        const shipped = req.query.shipped as string | undefined;
        const request = req.query.request as string | undefined;
        const filters = {
            searchTerm,
            page,
            pageSize,
            scanned: scanned === "true" ? true : scanned === "false" ? false : undefined,
            pickup: pickup === "true" ? true : pickup === "false" ? false : undefined,
            shipped: shipped === "true" ? true : shipped === "false" ? false : undefined,
            request: request === "true" ? true : request === "false" ? false : undefined,
        }

        const result = await shipmentService.listShipments(conn, { searchTerm, page, pageSize, scanned: filters.scanned, pickup: filters.pickup, shipped: filters.shipped, request: filters.request });
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
            },
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to list shipments" });
    }
}

export async function getShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.params.id;
        const shipmentId = Array.isArray(shipmentIdParam) ? parseInt(shipmentIdParam[0], 10) : parseInt(shipmentIdParam, 10);

        if (!shipmentId) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }

        const shipment = await shipmentService.getShipmentById(conn, shipmentId);
        if (!shipment) {
            res.status(404).json({ success: false, message: "Shipment not found" });
            return;
        }

        res.status(200).json({ success: true, data: shipment });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch shipment" });
    }
}

export async function updateShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.params.id;
        const shipmentId = Array.isArray(shipmentIdParam) ? parseInt(shipmentIdParam[0], 10) : parseInt(shipmentIdParam, 10);
        const payload = req.body as UpdateWarehouseShipment;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!shipmentId) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }

        const shipment = await shipmentService.updateShipmentWithRelations(conn, shipmentId, payload, userId);
        res.status(200).json({ success: true, message: "Shipment updated successfully", data: shipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" || error?.message?.toLowerCase().includes("duplicate") ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to update shipment" });
    }
}

export async function scanFreight(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.query.id as string | undefined;
        const barcodeValue = req.query.barcodeValue as string | undefined;
        const shipmentId = shipmentIdParam ? parseInt(shipmentIdParam, 10) : NaN;

        if (!shipmentId || !barcodeValue) {
            res.status(400).json({ success: false, message: "shipmentId and barcodeValue are required" });
            return;
        }

        const updatedShipment = await shipmentService.scanFreight(conn, shipmentId, barcodeValue);
        res.status(200).json({ success: true, message: "Freight scanned successfully", data: updatedShipment });

    } catch (error: any) {

        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to scan freight" });
    }
}

export async function unscanFreight(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.query.id as string | undefined;
        const barcodeValue = req.query.barcodeValue as string | undefined;
        const shipmentId = shipmentIdParam ? parseInt(shipmentIdParam, 10) : NaN;

        if (!shipmentId || !barcodeValue) {
            res.status(400).json({ success: false, message: "shipmentId and barcodeValue are required" });
            return;
        }

        const updatedShipment = await shipmentService.unscanFreight(conn, shipmentId, barcodeValue);
        res.status(200).json({ success: true, message: "Freight un-scanned successfully", data: updatedShipment });

    } catch (error: any) {

        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to un-scan freight" });
    }
}

export async function signOffShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.body.shipmentId as number | undefined;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!shipmentIdParam) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }
        const updatedShipment = await shipmentService.signOffShipment(conn, shipmentIdParam, userId);
        res.status(200).json({ success: true, message: "Shipment signed off successfully", data: updatedShipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to sign off shipment" });
    }
}

export async function shipmentSplitApproval(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.body.shipmentId as number | undefined;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!shipmentIdParam) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }
        const updatedShipment = await shipmentService.shipmentSplitApproval(conn, shipmentIdParam, userId);
        res.status(200).json({ success: true, message: "Shipment split approved successfully", data: updatedShipment });
    }
    catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to approve shipment split" });
    }
}

export async function completeShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.body.shipmentId as number | undefined;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!shipmentIdParam) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }
        const updatedShipment = await shipmentService.completeShipment(conn, shipmentIdParam, userId);
        res.status(200).json({ success: true, message: "Shipment completed successfully", data: updatedShipment });
    }
    catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to complete shipment" });
    }
}
