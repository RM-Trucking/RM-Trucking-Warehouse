import { Request, Response } from "express";
import { Connection } from "odbc";
import * as shipmentService from "../../services/shipment";
import { CreateWarehouseShipment, UpdateWarehouseShipment, WarehouseShipmentPickupRequest } from "../../entities/shipment";

export async function createShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const payload = req.body as CreateWarehouseShipment;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        const isAirShipment = payload.shipmentType === "AIR";
        const isOceanShipment = payload.shipmentType === "OCEAN_LCL" || payload.shipmentType === "OCEAN_FCL";
        const destinationRequired = payload.shipmentType === "OCEAN_FCL";
        const validAirConsignee = Number.isInteger(Number(payload.consigneeId)) && Number(payload.consigneeId) > 0;
        const validOceanConsignee = typeof payload.consigneeForOcean === "string" && Boolean(payload.consigneeForOcean.trim());
        if ((!isAirShipment && !isOceanShipment) || !payload.barcodeNumber || !payload.customerId || (isAirShipment && !validAirConsignee) || (isOceanShipment && !validOceanConsignee) || payload.pieces === undefined || payload.weight === undefined || !payload.stationScope || (destinationRequired && !payload.destination) || (payload.stationScope === "SPECIFIC" && !payload.stationId)) {
            res.status(400).json({ success: false, message: "shipmentType must be AIR, OCEAN_LCL or OCEAN_FCL; barcodeNumber, customerId, stationScope, pieces and weight are required; consigneeId is required for AIR; consigneeForOcean is required for ocean shipments; destination is required for OCEAN_FCL; stationId is required for SPECIFIC station scope" });
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

export async function uploadShipmentImages(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const rawShipmentId = req.body?.shipmentId ?? req.query?.shipmentId;
        const shipmentId = Number(Array.isArray(rawShipmentId) ? rawShipmentId[0] : rawShipmentId);
        if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
            res.status(400).json({ success: false, message: "A valid shipmentId is required" });
            return;
        }

        const uploadedFiles = Array.isArray((req as any).files)
            ? ((req as any).files as Express.Multer.File[])
            : [];
        if (!uploadedFiles.length) {
            res.status(400).json({ success: false, message: "At least one image file is required" });
            return;
        }

        const images = await shipmentService.uploadShipmentImages(
            conn,
            shipmentId,
            uploadedFiles.map((file) => (file as any).filename)
        );
        res.status(201).json({
            success: true,
            message: "Shipment images uploaded successfully",
            data: { shipmentId, images: images.map((image) => image.imagePath), count: images.length }
        });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.statusCode || (error?.name === "ValidationError" ? 400 : 500);
        res.status(statusCode).json({ success: false, message: error.message || "Failed to upload shipment images" });
    }
}

export async function deleteShipmentImage(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentId = Number(req.params.shipmentId);
        const imageId = Number(req.params.imageId);
        if (!Number.isInteger(shipmentId) || shipmentId <= 0 || !Number.isInteger(imageId) || imageId <= 0) {
            res.status(400).json({ success: false, message: "Valid shipmentId and imageId are required" });
            return;
        }

        const result = await shipmentService.deleteShipmentImage(conn, shipmentId, imageId);
        res.status(200).json({ success: true, message: "Shipment image deleted successfully", data: result });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.statusCode || 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to delete shipment image" });
    }
}

export async function listShipments(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const barcodeNumber = req.query.searchTerm as string | undefined;
        const page = parseInt(req.query.page as string, 10) || 1;
        const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
        const scanned = req.query.scanned as string | undefined;
        const pickup = req.query.pickup as string | undefined;
        const shipped = req.query.shipped as string | undefined;
        const canceled = req.query.canceled as string | undefined;
        const request = req.query.request as string | undefined;
        const shipmentType = req.query.shipmentType as string | undefined;
        const customerId = req.query.customerId as string | undefined;
        const stationId = req.query.stationId as string | undefined;
        const consigneeId = req.query.consigneeId as string | undefined;
        const airBillNumber = req.query.airBillNumber as string | undefined;

        const filters = {
            barcodeNumber,
            page,
            pageSize,
            scanned: scanned === "true" ? true : scanned === "false" ? false : undefined,
            pickup: pickup === "true" ? true : pickup === "false" ? false : undefined,
            shipped: shipped === "true" ? true : shipped === "false" ? false : undefined,
            request: request === "true" ? true : request === "false" ? false : undefined,
            canceled: canceled === "true" ? true : canceled === "false" ? false : undefined,
            shipmentType: shipmentType ? shipmentType.toUpperCase() : undefined,
            customerId: customerId ? customerId : undefined,
            stationId: stationId ? stationId : undefined,
            consigneeId: consigneeId ? consigneeId : undefined,
            airBillNumber: airBillNumber ? airBillNumber : undefined,
        }

        const result = await shipmentService.listShipments(conn, { barcodeNumber: filters.barcodeNumber, page: filters.page, pageSize: filters.pageSize, scanned: filters.scanned, pickup: filters.pickup, shipped: filters.shipped, request: filters.request, canceled: filters.canceled, shipmentType: filters.shipmentType, customerId: filters.customerId, stationId: filters.stationId, consigneeId: filters.consigneeId, airBillNumber: filters.airBillNumber });
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
            },
            countList: result.countList,
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

export async function getShipmentForPickup(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentIdParam = req.params.id;
        const shipmentId = Array.isArray(shipmentIdParam) ? parseInt(shipmentIdParam[0], 10) : parseInt(shipmentIdParam, 10);

        if (!shipmentId) {
            res.status(400).json({ success: false, message: "shipmentId is required" });
            return;
        }
        const shipment = await shipmentService.getShipmentByIdForPickup(conn, shipmentId);
        if (!shipment) {
            res.status(404).json({ success: false, message: "Shipment not found" });
            return;
        }

        res.status(200).json({ success: true, data: shipment });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch shipment for pickup" });
    }
}

export async function createShipmentPickupEntry(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const payload = req.body as WarehouseShipmentPickupRequest;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const shipmentId = Number(payload.shipmentId);
        const pieces = Number(payload.pieces);
        const weight = Number(payload.weight);

        if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
            res.status(400).json({ success: false, message: "shipmentId must be a positive integer" });
            return;
        }
        if (!payload.barcodeNumber || !payload.pickupDate || !payload.contactName || !payload.customerId || !payload.stationId || !payload.readyDate || !payload.closeDate || !payload.loDate || !Number.isFinite(pieces) || !Number.isFinite(weight)) {
            res.status(400).json({ success: false, message: "barcodeNumber, pickupDate, contactName, customerId, stationId, pieces, weight, readyDate, closeDate and loDate are required" });
            return;
        }

        const pickupEntry = await shipmentService.createShipmentPickupEntry(conn, {
            ...payload,
            shipmentId,
            customerId: Number(payload.customerId),
            stationId: Number(payload.stationId),
            pieces,
            weight,
        }, userId);
        res.status(201).json({ success: true, message: "Shipment pickup entry created successfully", data: pickupEntry });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to create shipment pickup entry" });
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

        if (payload.shipmentType && !["AIR", "OCEAN_LCL", "OCEAN_FCL"].includes(payload.shipmentType)) {
            res.status(400).json({ success: false, message: "shipmentType must be AIR, OCEAN_LCL or OCEAN_FCL" });
            return;
        }
        if (payload.stationScope && payload.stationScope !== "ALL" && payload.stationScope !== "SPECIFIC") {
            res.status(400).json({ success: false, message: "stationScope must be ALL or SPECIFIC" });
            return;
        }
        if (payload.stationScope === "ALL") {
            payload.stationId = null;
        } else if (payload.stationScope === "SPECIFIC" && !payload.stationId) {
            res.status(400).json({ success: false, message: "stationId is required for SPECIFIC station scope" });
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

export async function updateShipmentPickupEntryNumber(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const payload = req.body as { shipmentId?: unknown; pickupEntryNumber?: unknown };
        const shipmentId = Number(payload?.shipmentId);
        const pickupEntryNumber = payload?.pickupEntryNumber === null
            ? null
            : typeof payload?.pickupEntryNumber === "string"
                ? payload.pickupEntryNumber.trim()
                : undefined;

        if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
            res.status(400).json({ success: false, message: "shipmentId must be a positive integer" });
            return;
        }
        if (pickupEntryNumber === undefined) {
            res.status(400).json({ success: false, message: "pickupEntryNumber is required and must be a string or null" });
            return;
        }

        const shipment = await shipmentService.updateShipmentPickupEntryNumber(conn, shipmentId, pickupEntryNumber, userId);
        if (!shipment) {
            res.status(404).json({ success: false, message: `Shipment with id ${shipmentId} was not found` });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Pickup entry number updated successfully",
            data: shipment,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to update pickup entry number" });
    }
}

function getShipmentReceiptIds(req: Request): { shipmentId: number; receiptId: number } | null {
    const shipmentId = Number(req.params.shipmentId ?? req.body?.shipmentId);
    const receiptId = Number(req.params.receiptId ?? req.body?.receiptId);
    return Number.isInteger(shipmentId) && shipmentId > 0 && Number.isInteger(receiptId) && receiptId > 0
        ? { shipmentId, receiptId }
        : null;
}

export async function addReceiptToShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const ids = getShipmentReceiptIds(req);
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!ids) {
            res.status(400).json({ success: false, message: "shipmentId and receiptId must be positive integers" });
            return;
        }
        const shipment = await shipmentService.addReceiptToShipment(conn, ids.shipmentId, ids.receiptId, userId);
        res.status(200).json({ success: true, message: "Warehouse receipt added to shipment successfully", data: shipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to add warehouse receipt to shipment" });
    }
}

export async function removeReceiptFromShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const ids = getShipmentReceiptIds(req);
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!ids) {
            res.status(400).json({ success: false, message: "shipmentId and receiptId must be positive integers" });
            return;
        }
        const shipment = await shipmentService.removeReceiptFromShipment(conn, ids.shipmentId, ids.receiptId, userId);
        res.status(200).json({ success: true, message: "Warehouse receipt removed from shipment successfully", data: shipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to remove warehouse receipt from shipment" });
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

        const userId = (req as any).user?.userId || (req as any).user?.id || 0;
        const updatedShipment = await shipmentService.scanFreight(conn, shipmentId, barcodeValue, userId);
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

        const userId = (req as any).user?.userId || (req as any).user?.id || 0;
        const updatedShipment = await shipmentService.unscanFreight(conn, shipmentId, barcodeValue, userId);
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

export async function revokeShipmentCompletion(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentId = Number(req.body.shipmentId);
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
            res.status(400).json({ success: false, message: "shipmentId must be a positive integer" });
            return;
        }

        const updatedShipment = await shipmentService.revokeShipmentCompletion(conn, shipmentId, userId);
        res.status(200).json({ success: true, message: "Shipment completion revoked successfully", data: updatedShipment });
    }
    catch (error: any) {
        console.error(error);
        const statusCode = error?.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || "Failed to revoke shipment completion" });
    }
}

export async function cancelShipment(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const shipmentId = Number(req.body.shipmentId);
        const canceledReason = typeof req.body?.canceledReason === "string" ? req.body.canceledReason.trim() : "";
        const userId = (req as any).user?.userId || (req as any).user?.id || 0;

        if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
            res.status(400).json({ success: false, message: "shipmentId must be a positive integer" });
            return;
        }
        if (!canceledReason) {
            res.status(400).json({ success: false, message: "canceledReason is required" });
            return;
        }

        const shipment = await shipmentService.cancelShipment(conn, shipmentId, userId, canceledReason);
        res.status(200).json({ success: true, message: "Shipment canceled successfully", data: shipment });
    } catch (error: any) {
        console.error(error);
        const statusCode = error?.statusCode ?? (error?.name === "ValidationError" ? 400 : 500);
        res.status(statusCode).json({ success: false, message: error.message || "Failed to cancel shipment" });
    }
}
