import { Request, Response } from "express";
import { Connection } from "odbc";
import * as warehouseReceiptService from "../../services/warehouse-receipt";
import { Logger } from "../../utils/logger";
import fs from "fs/promises";
import path from "path";

const logger = new Logger("WarehouseReceiptController");

/**
 * GET WAREHOUSE RECEIPT WITH DETAILS
 * Endpoint: GET /warehouse-receipt/:id?searchBy=receiptId (default)
 * Endpoint: GET /warehouse-receipt/:proNumber?searchBy=proNumber
 *
 * Query parameters:
 * - searchBy: "receiptId" (default) or "proNumber" to specify the lookup type
 */
export async function getWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const searchBy = (req.query.searchBy as string) || "receiptNumber"; // Default to receiptNumber

        if (!id) {
            res.status(400).json({ success: false, message: "Receipt ID or PRO number is required" });
            return;
        }

        let data;

        // Search by receipt ID (default)
        if (searchBy === "receiptNumber") {
            const receipt = await warehouseReceiptService.getWarehouseReceiptWithDetailsService(
                conn,
                Number(id)
            );
            data = receipt ? [receipt] : [];
        }
        // Search by PRO number
        else if (searchBy === "proNumber") {
            data = await warehouseReceiptService.getWarehouseReceiptsByProService(conn, id);
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Invalid searchBy parameter. Use "receiptNumber" or "proNumber"'
            });
            return;
        }

        if (!data) {
            res.status(404).json({
                success: false,
                message: `Receipt not found for ${searchBy}: ${id}`
            });
            return;
        }

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.log(error);

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
        const requiredFields = ['customerId', 'stationId', 'carrierId', 'status', 'shipper', 'receivedBy', 'location', 'proNumber'];
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

/**
 * BATCH PROCESS WAREHOUSE RECEIPTS V2 (HYBRID)
 * Handles Base64 string interception from body, converting them to physical files,
 * then routes to either standard batch processing or batch with images.
 */
export async function batchProcessWarehouseReceiptsV2(
    req: Request,
    res: Response,
    conn: Connection
): Promise<void> {
    try {
        if (!(req as any).files) {
            (req as any).files = [];
        }

        // HYBRID HANDLING: Process Base64 strings sent as text fields in FormData
        const uploadDir = path.join(process.cwd(), 'uploads', 'freight-images');
        let dirCreated = false;

        for (const [key, value] of Object.entries(req.body || {})) {
            if (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('base64,'))) {
                if (!dirCreated) {
                    await fs.mkdir(uploadDir, { recursive: true });
                    dirCreated = true;
                }

                // Strip out data URL prefix if it exists
                const base64Data = value.replace(/^(data:image\/\w+;base64,|base64,)/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `base64-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
                const filePath = path.join(uploadDir, fileName);
                
                await fs.writeFile(filePath, buffer);
                
                // Inject mock Multer file into req.files so downstream logic handles it naturally
                ((req as any).files).push({
                    fieldname: key,
                    originalname: fileName,
                    filename: fileName,
                    path: filePath,
                    size: buffer.length,
                    mimetype: 'image/jpeg'
                });
                
                delete req.body[key]; // Keep body clean for JSON parsing downstream
            }
        }

        // Check if any images are present (either standard files or converted Base64)
        const hasImages = (req as any).files && (req as any).files.length > 0;
        if (hasImages) {
            await batchProcessWarehouseReceiptsWithImages(req, res, conn);
        } else {
            await batchProcessWarehouseReceipts(req, res, conn);
        }
    } catch (error: any) {
        console.log(error);
        logger.error("Error in batch process V2", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function rejectWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;
        const { rejectionReason } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }
        if (!rejectionReason) {
            res.status(400).json({ success: false, message: "Rejection reason is required" });
            return;
        }
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }
        await warehouseReceiptService.rejectWarehouseReceiptService(
            conn,
            Number(receiptId),
            rejectionReason,
            userId
        );

        res.status(200).json({
            success: true,
            message: " Warehouse Receipt rejected successfully",
        });
    } catch (error: any) {
        console.log(error);
        logger.error("Error rejecting warehouse receipt", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET PRO HEADER DETAILS
 * Endpoint: GET /warehouse-receipt/pro-detail/:proNumber
 * Returns formatted PRO data for a given PRO number with duplicate checks
 */
export async function getProHeaderDetails(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const proNumber = Array.isArray(req.params.pro) ? req.params.pro[0] : req.params.pro;

        if (!proNumber) {
            res.status(400).json({ success: false, message: "PRO number is required" });
            return;
        }

        const proDetails = await warehouseReceiptService.getProHeaderDetailsService(conn, proNumber);

        res.status(200).json({
            success: true,
            data: proDetails
        });
    } catch (error: any) {
        logger.error("Error fetching PRO header details", error);

        console.log(error);


        // Check if it's a duplicate error
        if (error.message.includes("Duplicate")) {
            res.status(409).json({ success: false, message: error.message });
        } else if (error.message.includes("No PRO detail found")) {
            res.status(404).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
