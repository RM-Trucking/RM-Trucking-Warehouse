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

/**
 * CREATE TEMPORARY WAREHOUSE RECEIPT
 * Endpoint: POST /warehouse-receipt/temp
 * Returns all created temp receipt data
 * Auto-generated: receiptNumber, receiptDate, createdBy (from req.user), createdAt
 */
export async function createTemporaryWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const tempData = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        // Validate required fields
        const requiredFields = ['verificationId', 'customerId', 'stationId', 'carrierId', 'status', 'shipper', 'receivedBy', 'location', 'destination', 'proNumber', 'packageId'];
        const missingFields = requiredFields.filter(field => !tempData[field]);

        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                message: `Required fields missing: ${missingFields.join(', ')}`
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }

        const result = await warehouseReceiptService.createTemporaryWarehouseReceiptService(conn, tempData, userId);

        res.status(201).json({
            success: true,
            message: "Temporary warehouse receipt created successfully",
            data: result
        });
    } catch (error: any) {
        console.log(error);
        logger.error("Error creating temporary warehouse receipt", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * CREATE WAREHOUSE RECEIPT WITH FREIGHT INFO
 * Endpoint: POST /warehouse-receipt
 * Takes receipt data + array of freight info
 * Returns created receipt with all freight details
 * Auto-generated: receiptNumber, documentId, createdBy (from req.user), createdAt
 */
export async function createWarehouseReceiptWithFreight(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receipt, freightDetails } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!receipt || !Array.isArray(freightDetails)) {
            res.status(400).json({
                success: false,
                message: "Receipt data and freightDetails array are required"
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }

        const result = await warehouseReceiptService.createWarehouseReceiptWithFreightService(
            conn,
            receipt,
            freightDetails,
            userId
        );

        res.status(201).json({
            success: true,
            message: "Warehouse receipt created successfully with freight info",
            data: result
        });
    } catch (error: any) {
        logger.error("Error creating warehouse receipt with freight", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * BATCH PROCESS WAREHOUSE RECEIPTS
 * Endpoint: POST /warehouse-receipt/batch
 * Process array of receipts - update if receiptId exists, create if not
 * Auto-generated: receiptNumber, documentId, createdBy (from req.user), createdAt
 */
export async function batchProcessWarehouseReceipts(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receipts } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!Array.isArray(receipts) || receipts.length === 0) {
            res.status(400).json({
                success: false,
                message: "receipts array (non-empty) is required. Each item must have receipt object and freightDetails array. Receipt with receiptId will be updated, without receiptId will be created"
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }

        const result = await warehouseReceiptService.batchProcessWarehouseReceiptsService(
            conn,
            receipts,
            userId
        );

        res.status(201).json({
            success: true,
            message: "Batch process completed successfully",
            data: result
        });
    } catch (error: any) {
        console.log(error);
        logger.error("Error in batch process warehouse receipts", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * BATCH PROCESS WAREHOUSE RECEIPTS WITH IMAGE UPLOADS
 * Endpoint: POST /warehouse-receipt/batch-with-images
 * 
 * Handles multipart/form-data with:
 * - Field: batchData (JSON string with receipts array)
 * - Files: Multiple images with fieldname format: freight-{receiptIndex}-{freightIndex}-{imageIndex}
 * 
 * Example:
 * - Field name: freight-0-0-0 → receipts[0].freightDetails[0].images[0]
 * - Field name: freight-0-0-1 → receipts[0].freightDetails[0].images[1]
 * - Field name: freight-0-1-0 → receipts[0].freightDetails[1].images[0]
 */
export async function batchProcessWarehouseReceiptsWithImages(
    req: Request,
    res: Response,
    conn: Connection
): Promise<void> {
    try {

        console.log("Received batch process with images request");

        const { batchData } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const uploadedFiles = (req as any).files || [];

        console.log("Batch data:", batchData);
        console.log("Uploaded files:", uploadedFiles);

        if (!batchData) {
            res.status(400).json({
                success: false,
                message: "batchData field is required (JSON string)"
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }

        // Parse batch data from string
        let parsedData;
        try {
            parsedData = typeof batchData === 'string' ? JSON.parse(batchData) : batchData;
        } catch (parseError) {
            res.status(400).json({
                success: false,
                message: "Invalid batchData JSON format"
            });
            return;
        }

        // Validate batch data structure
        const { processUploadedImages, validateBatchData } = await import("../../services/warehouse-receipt/image-handler");
        const validation = validateBatchData(parsedData);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: "Batch data validation failed",
                errors: validation.errors
            });
            return;
        }

        // Process uploaded images and map them to freight items
        const processedData = processUploadedImages(parsedData, uploadedFiles);

        if (!Array.isArray(processedData.receipts) || processedData.receipts.length === 0) {
            res.status(400).json({
                success: false,
                message: "receipts array (non-empty) is required"
            });
            return;
        }

        // Process batch with images
        const result = await warehouseReceiptService.batchProcessWarehouseReceiptsService(
            conn,
            processedData.receipts,
            userId
        );

        res.status(201).json({
            success: true,
            message: "Batch process with images completed successfully",
            data: result,
            filesProcessed: uploadedFiles.length
        });
    } catch (error: any) {
        console.log(error);
        logger.error("Error in batch process warehouse receipts with images", error);
        res.status(500).json({ success: false, message: error.message });
    }
}
