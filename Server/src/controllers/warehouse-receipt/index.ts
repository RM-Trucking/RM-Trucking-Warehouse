import { Request, Response } from "express";
import { Connection } from "odbc";
import * as warehouseReceiptService from "../../services/warehouse-receipt";
import { Logger } from "../../utils/logger";

const logger = new Logger("WarehouseReceiptController");

/**
 * GET WAREHOUSE RECEIPT WITH DETAILS
 * Endpoint: GET /warehouse-receipt/:receiptId
 */
export async function getWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;

        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }

        const data = await warehouseReceiptService.getWarehouseReceiptWithDetailsService(
            conn,
            Number(receiptId)
        );

        if (!data) {
            res.status(404).json({ success: false, message: "Receipt not found" });
            return;
        }

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        logger.error("Error fetching warehouse receipt", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * LIST WAREHOUSE RECEIPTS WITH PAGINATION & FILTERS
 * Endpoint: GET /warehouse-receipt?page=1&pageSize=10&status=INITIATE&carrierId=1
 */
export async function listWarehouseReceipts(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;
        const status = req.query.status as string | undefined;
        const carrierId = req.query.carrierId ? parseInt(req.query.carrierId as string) : undefined;

        const result = await warehouseReceiptService.listWarehouseReceiptsService(
            conn,
            page,
            pageSize,
            { status, carrierId }
        );

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                pageSize: result.pageSize
            }
        });
    } catch (error: any) {
        logger.error("Error listing warehouse receipts", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET RECEIPTS BY VERIFICATION ID
 * Endpoint: GET /warehouse-receipt/verification/:verificationId
 */
export async function getReceiptsByVerification(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const verificationId = Array.isArray(req.params.verificationId) ? req.params.verificationId[0] : req.params.verificationId;

        if (!verificationId) {
            res.status(400).json({ success: false, message: "Verification ID is required" });
            return;
        }

        const data = await warehouseReceiptService.getReceiptsByVerificationService(
            conn,
            Number(verificationId)
        );

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        logger.error("Error fetching receipts by verification", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET RECEIPTS BY CUSTOMER & STATION
 * Endpoint: GET /warehouse-receipt/customer-station?customerId=1&stationId=1
 */
export async function getReceiptsByCustomerStation(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const customerId = parseInt(req.query.customerId as string);
        const stationId = parseInt(req.query.stationId as string);

        if (!customerId || !stationId) {
            res.status(400).json({ success: false, message: "customerId and stationId are required" });
            return;
        }

        const data = await warehouseReceiptService.getReceiptsByCustomerStationService(
            conn,
            customerId,
            stationId
        );

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        logger.error("Error fetching receipts by customer/station", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * UPDATE WAREHOUSE RECEIPT
 * Endpoint: PUT /warehouse-receipt/:receiptId
 */
export async function updateWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;
        const updates = req.body;

        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }

        const result = await warehouseReceiptService.updateWarehouseReceiptService(
            conn,
            Number(receiptId),
            updates
        );

        if (!result) {
            res.status(404).json({ success: false, message: "Receipt not found" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Receipt updated successfully",
            data: result
        });
    } catch (error: any) {
        logger.error("Error updating warehouse receipt", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET RECEIPT SUMMARY
 * Endpoint: GET /warehouse-receipt/:receiptId/summary
 */
export async function getReceiptSummary(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;

        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }

        const summary = await warehouseReceiptService.getReceiptSummaryService(
            conn,
            Number(receiptId)
        );

        if (!summary) {
            res.status(404).json({ success: false, message: "Receipt not found" });
            return;
        }

        res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
        logger.error("Error fetching receipt summary", error);
        res.status(500).json({ success: false, message: error.message });
    }
}
