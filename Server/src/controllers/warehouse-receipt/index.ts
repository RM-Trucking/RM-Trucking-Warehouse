import { Request, Response } from "express";
import { Connection } from "odbc";
import * as warehouseReceiptService from "../../services/warehouse-receipt";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
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
 * Endpoint: GET /warehouse-receipt?page=1&pageSize=10&status=INITIATE
 */
export async function listWarehouseReceipts(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;
        const status = req.query.status as string | undefined;
        const receiptNumber = req.query.receiptNumber as string | undefined;
        const accounting = req.query.accounting === 'true' ? true : req.query.accounting === 'false' ? false : undefined;
        const filters = {
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
            stationId: req.query.stationId ? parseInt(req.query.stationId as string) : undefined,
            carrierId: req.query.carrierId ? parseInt(req.query.carrierId as string) : undefined,
            location: req.query.location as string | undefined,
            proNumber: req.query.proNumber as string | undefined,
            verificationId: req.query.verificationId ? parseInt(req.query.verificationId as string) : undefined,
            destination: req.query.destination as string | undefined,
            packageId: req.query.packageId as string | undefined,
            customerRefNumber: req.query.customerRefNumber as string | undefined
        };

        const result = await warehouseReceiptService.listWarehouseReceiptsService(
            conn,
            page,
            pageSize,
            status,
            receiptNumber,
            accounting,
            filters
        );

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total
            },
            countList: result.countList
        });
    } catch (error: any) {
        logger.error("Error listing warehouse receipts", error);
        console.log(error);

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

function tryParseJSON(value: any): any {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function normalizeArrayField(value: any): any[] {
    if (Array.isArray(value)) return value;
    const parsed = tryParseJSON(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed === undefined || parsed === null || parsed === "") return [];
    return [parsed];
}

function normalizeEditPayload(body: any) {
    const rawReceipt = body.receipt !== undefined ? tryParseJSON(body.receipt) : { ...body };
    const receipt = typeof rawReceipt === "object" && rawReceipt !== null ? rawReceipt : {};

    const freightDetails = normalizeArrayField(body.freightDetails).map((item: any) => {
        if (item && typeof item === "string") {
            return tryParseJSON(item);
        }
        return item || {};
    });

    const removeFreightIds = normalizeArrayField(body.removeFreightIds).map((value: any) => Number(value)).filter((value: number) => !isNaN(value));
    const badFreightImages = normalizeArrayField(body.badFreightImages);
    const removeBadFreightImagePaths = normalizeArrayField(body.removeBadFreightImagePaths);

    if (body.receipt === undefined) {
        delete receipt.freightDetails;
        delete receipt.removeFreightIds;
        delete receipt.badFreightImages;
        delete receipt.removeBadFreightImagePaths;
    }

    return {
        receipt,
        freightDetails,
        removeFreightIds,
        badFreightImages,
        removeBadFreightImagePaths
    };
}

function getReceiptIdFromRequest(req: Request): number | null {
    const rawValue = req.body?.receiptId ?? req.query?.receiptId ?? req.params?.receiptId;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const parsedValue = Number(value);

    return Number.isNaN(parsedValue) ? null : parsedValue;
}

export async function uploadWarehouseReceiptDocuments(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = getReceiptIdFromRequest(req);
        if (!receiptId) {
            res.status(400).json({ success: false, message: "receiptId is required" });
            return;
        }

        const uploadedFiles = Array.isArray((req as any).files)
            ? ((req as any).files as Express.Multer.File[])
            : [];

        console.log("Uploaded files:", uploadedFiles.map(file => ({ originalname: file.originalname, path: file.path, mimetype: file.mimetype })));

        if (!uploadedFiles.length) {
            res.status(400).json({ success: false, message: "At least one document file is required" });
            return;
        }

        const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        if (!existingReceipt) {
            res.status(404).json({ success: false, message: `Receipt with ID ${receiptId} not found` });
            return;
        }

        const documentIds = await warehouseReceiptService.uploadWarehouseReceiptDocumentsService(
            conn,
            receiptId,
            uploadedFiles.map((file) => ({
                filename: (file as any).filename || path.basename(file.path),
                originalname: file.originalname,
                mimetype: file.mimetype
            }))
        );

        res.status(201).json({
            success: true,
            message: "Documents uploaded successfully",
            data: {
                receiptId,
                documentIds,
                count: documentIds.length
            }
        });
    } catch (error: any) {
        console.log(error);
        logger.error("Error uploading warehouse receipt documents", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function convertBase64FieldsToFiles(req: Request): Promise<void> {
    if (!(req as any).files) {
        (req as any).files = [];
    }

    const freightImageDir = path.resolve(process.cwd(), process.env.FREIGHT_IMAGE_PATH || "uploads/warehouse/freight-image");
    const badFreightImageDir = path.resolve(process.cwd(), process.env.BAD_FREIGHT_IMAGE_PATH || "uploads/warehouse/bad-freight-image");

    const ensureDirExists = async (dir: string) => {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    };

    let freightDirCreated = false;
    let badFreightDirCreated = false;

    for (const [key, value] of Object.entries(req.body || {})) {
        if (typeof value !== "string") continue;

        const isBase64 = value.startsWith("data:image/") || value.startsWith("base64,");
        if (!isBase64) continue;

        const isBadFreight = key.startsWith("bad-freight-image-");
        const uploadDir = isBadFreight ? badFreightImageDir : freightImageDir;

        console.log(`Processing Base64 field: ${key}, isBadFreight: ${isBadFreight}, uploadDir: ${uploadDir}`);

        if (isBadFreight && !badFreightDirCreated) {
            await ensureDirExists(badFreightImageDir);
            badFreightDirCreated = true;
        } else if (!isBadFreight && !freightDirCreated) {
            await ensureDirExists(freightImageDir);
            freightDirCreated = true;
        }

        const base64Data = value.replace(/^(data:image\/\w+;base64,|base64,)/, "");
        const contentTypeMatch = /^data:image\/(\w+);base64,/.exec(value);
        const ext = contentTypeMatch ? contentTypeMatch[1] : "jpg";
        const fileName = `base64-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(base64Data, "base64");

        await fs.writeFile(filePath, buffer);

        ((req as any).files).push({
            fieldname: key,
            originalname: fileName,
            filename: fileName,
            path: filePath,
            size: buffer.length,
            mimetype: `image/${ext}`
        });

        delete req.body[key];
    }
}

function attachUploadedFilesToPayload(payload: any, files: any[]) {
    for (const file of files || []) {
        if (!file || !file.fieldname || !file.filename) continue;

        const freightMatch = /^freight-(\d+)-\d+$/.exec(file.fieldname);
        if (freightMatch) {
            const index = Number(freightMatch[1]);

            // Prefer attaching to receipt.freightDetails when receipt payload exists
            if (payload.receipt && Array.isArray(payload.receipt.freightDetails)) {
                payload.receipt.freightDetails[index] = payload.receipt.freightDetails[index] || {};
                payload.receipt.freightDetails[index].newImages = payload.receipt.freightDetails[index].newImages || [];
                payload.receipt.freightDetails[index].newImages.push(file.filename);
            } else {
                payload.freightDetails = payload.freightDetails || [];
                if (!payload.freightDetails[index]) {
                    payload.freightDetails[index] = {};
                }
                payload.freightDetails[index].newImages = payload.freightDetails[index].newImages || [];
                payload.freightDetails[index].newImages.push(file.filename);
            }
            continue;
        }

        const badFreightMatch = /^bad-freight-image(?:-\d+)?$/.exec(file.fieldname);
        if (badFreightMatch) {
            payload.badFreightImages = payload.badFreightImages || [];
            payload.badFreightImages.push(file.filename);
            continue;
        }

        if (/^(bad-?freight|badFreight)/i.test(file.fieldname)) {
            payload.badFreightImages = payload.badFreightImages || [];
            payload.badFreightImages.push(file.filename);
            continue;
        }

        if (/^freight/i.test(file.fieldname)) {
            // Generic freight field: attach to first freight in receipt if present, otherwise top-level
            if (payload.receipt && Array.isArray(payload.receipt.freightDetails)) {
                payload.receipt.freightDetails[0] = payload.receipt.freightDetails[0] || {};
                payload.receipt.freightDetails[0].newImages = payload.receipt.freightDetails[0].newImages || [];
                payload.receipt.freightDetails[0].newImages.push(file.filename);
            } else {
                payload.freightDetails = payload.freightDetails || [];
                if (!payload.freightDetails[0]) {
                    payload.freightDetails[0] = {};
                }
                payload.freightDetails[0].newImages = payload.freightDetails[0].newImages || [];
                payload.freightDetails[0].newImages.push(file.filename);
            }
        }
    }
}

/**
 * UPDATE WAREHOUSE RECEIPT
 * Endpoint: PUT /warehouse-receipt/:receiptId
 */
export async function updateWarehouseReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        console.log(req.params);
        const receiptId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        console.log("Hellooooooooooo.........................");
        console.log("Updating warehouse receipt with ID:", receiptId);
        console.log("Request body:", req.body);

        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }

        await convertBase64FieldsToFiles(req);

        const payload = normalizeEditPayload(req.body || {});
        attachUploadedFilesToPayload(payload, (req as any).files || []);
        const userId = (req as any).user?.userId || (req as any).user?.id;

        const hasFreightUpdate = Array.isArray(payload.freightDetails) && payload.freightDetails.length > 0;
        const hasRemoval = Array.isArray(payload.removeFreightIds) && payload.removeFreightIds.length > 0;
        const hasBadFreightUpdate = Array.isArray(payload.badFreightImages) && payload.badFreightImages.length > 0;
        const hasBadFreightRemoval = Array.isArray(payload.removeBadFreightImagePaths) && payload.removeBadFreightImagePaths.length > 0;
        const hasUploadedFiles = Array.isArray((req as any).files) && (req as any).files.length > 0;
        const hasReceiptUpdates = Object.keys(payload.receipt || {}).length > 0;

        console.log("Payload Data - ", payload);

        let result;
        if (hasFreightUpdate || hasRemoval || hasBadFreightUpdate || hasBadFreightRemoval || hasUploadedFiles || hasReceiptUpdates) {
            result = await warehouseReceiptService.editWarehouseReceiptService(
                conn,
                Number(receiptId),
                payload,
                userId
            );
        } else {
            result = await warehouseReceiptService.updateWarehouseReceiptService(
                conn,
                Number(receiptId),
                req.body
            );
        }

        // if (!result) {
        //     res.status(404).json({ success: false, message: "Receipt not found" });
        //     return;
        // }

        res.status(200).json({
            success: true,
            message: "Receipt updated successfully",
            data: result
        });
    } catch (error: any) {
        console.log(error);
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
 * PRINT LABEL
 * Endpoint: POST /warehouse-receipt/label-print
 * Supports either full payload data or only receiptNumber
 * Requires printerPort and printerIP always
 */
export async function printLabel(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receiptNumber } = req.query;
        const { printerPort, printerIP } = req.query;
        const payload = req.body;

        if (!printerPort || !printerIP || !receiptNumber) {
            res.status(400).json({ success: false, message: "printerPort, printerIP, and receiptNumber are required" });
            return;
        }

        const result = await warehouseReceiptService.printWarehouseReceiptLabelService(
            conn,
            {
                printerPort,
                printerIP,
                receiptNumber: Number(receiptNumber),
                ...payload
            }
        );

        res.status(200).json({
            success: true,
            message: "Label print sent successfully",
            data: result
        });
    } catch (error: any) {
        logger.error("Error printing label", error);
        res.status(400).json({ success: false, message: error.message });
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
        const requiredFields = ['customerId', 'stationId', 'carrierId', 'status', 'shipper', 'proNumber'];
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
export async function batchProcessWarehouseReceiptsWithoutImages(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        // Accept either { batchData: {...} } or raw body containing the batch data (or an array)
        const rawBatch = (req.body && (req.body.batchData ?? req.body)) as any;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const split = req.query.split === 'true'; // Optional query parameter to indicate splitting
        const parentReceiptId = req.query.parentReceiptId as string | undefined; // Optional query parameter for parent receipt ID
        const parentReceiptIdNum = parentReceiptId ? parseInt(parentReceiptId) : undefined;

        if (split) {
            if (!parentReceiptIdNum) {
                res.status(400).json({
                    success: false,
                    message: "parentReceiptId is required for split operation"
                });
                return;
            }
        }

        // Normalize: if rawBatch is a JSON string, parse it
        let parsedBatch: any = rawBatch;
        if (typeof parsedBatch === 'string') {
            try {
                parsedBatch = JSON.parse(parsedBatch);
            } catch (err) {
                res.status(400).json({ success: false, message: "Invalid batchData JSON format" });
                return;
            }
        }

        // Ensure we have an object with a `receipts` array. If the client posted an array directly, wrap it.
        const receipts = Array.isArray(parsedBatch) ? parsedBatch : parsedBatch?.receipts;

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
            userId,
            split,
            parentReceiptIdNum
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
 * Endpoint: POST /warehouse-receipt/batch
 * 
 * Handles multipart/form-data with:
 * - Field: batchData (JSON string with receipts array)
 * - Freight images: fieldname format freight-{receiptIndex}-{freightIndex}-{imageIndex}
 * - Bad freight images: fieldname format bad-freight-image-{receiptIndex}-{imageIndex}
 * 
 * Example:
 * - freight-0-0-0 → receipts[0].freightDetails[0].images[0]
 * - freight-0-0-1 → receipts[0].freightDetails[0].images[1]
 * - bad-freight-image-0-0 → receipts[0].badFreightImages[0]
 * - bad-freight-image-0-1 → receipts[0].badFreightImages[1]
 */
export async function batchProcessWarehouseReceiptsWithImages(
    req: Request,
    res: Response,
    conn: Connection
): Promise<void> {
    try {

        // Accept either { batchData: {...} } or raw body containing the batch data (or an array)
        const rawBatch = (req.body && (req.body.batchData ?? req.body)) as any;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const uploadedFiles = (req as any).files || [];
        const split = req.query.split === 'true'; // Optional query parameter to indicate splitting
        const parentReceiptId = req.query.parentReceiptId as string | undefined; // Optional query parameter for parent receipt ID
        const parentReceiptIdNum = parentReceiptId ? parseInt(parentReceiptId) : undefined;

        if (split) {
            if (!parentReceiptIdNum) {
                res.status(400).json({
                    success: false,
                    message: "parentReceiptId is required for split operation"
                });
                return;
            }
        }


        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User ID not found in authentication token"
            });
            return;
        }

        // Parse batch data from string if necessary and normalize
        let parsedData: any = rawBatch;
        if (typeof parsedData === 'string') {
            try {
                parsedData = JSON.parse(parsedData);
            } catch (parseError) {
                res.status(400).json({ success: false, message: "Invalid batchData JSON format" });
                return;
            }
        }

        // Normalize to object with receipts array
        const normalized = Array.isArray(parsedData) ? { receipts: parsedData } : parsedData || {};

        // Validate batch data structure
        const { processUploadedImages, validateBatchData } = await import("../../services/warehouse-receipt/image-handler");
        const validation = validateBatchData(normalized);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: "Batch data validation failed",
                errors: validation.errors
            });
            return;
        }

        // Process uploaded images and map them to freight items and bad freight items
        const processedData = processUploadedImages(normalized, uploadedFiles);



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
            userId,
            split,
            parentReceiptIdNum
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
 * 
 * Supports both:
 * - Freight images: fieldname format freight-{receiptIndex}-{freightIndex}-{imageIndex}
 * - Bad freight images: fieldname format bad-freight-image-{receiptIndex}-{imageIndex}
 */
export async function batchProcessWarehouseReceipts(
    req: Request,
    res: Response,
    conn: Connection
): Promise<void> {
    try {
        if (!(req as any).files) {
            (req as any).files = [];
        }

        const freightImageDir = process.env.FREIGHT_IMAGE_PATH;
        const badFreightImageDir = process.env.BAD_FREIGHT_IMAGE_PATH;

        if (!freightImageDir || !badFreightImageDir) {
            res.status(400).json({
                success: false,
                message: "Upload directories not configured"
            });
            return;
        }

        const ensureDirExists = async (dir: string) => {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }
        };

        let freightDirCreated = false;
        let badFreightDirCreated = false;

        // HYBRID HANDLING: Process Base64 strings sent as text fields in FormData
        for (const [key, value] of Object.entries(req.body || {})) {

            console.log(`Processing field: ${key}`);
            console.log(`Value type: ${typeof value}, value preview: ${typeof value === 'string' ? value.substring(0, 30) : 'N/A'}`);

            if (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('base64,'))) {
                // Determine which directory based on field name pattern
                const isBadFreight = key.startsWith('bad-freight-image-');
                const uploadDir = isBadFreight ? badFreightImageDir : freightImageDir;

                // Create directories if needed
                if (isBadFreight && !badFreightDirCreated) {
                    await ensureDirExists(badFreightImageDir);
                    badFreightDirCreated = true;
                } else if (!isBadFreight && !freightDirCreated) {
                    await ensureDirExists(freightImageDir);
                    freightDirCreated = true;
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
            await batchProcessWarehouseReceiptsWithoutImages(req, res, conn);
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
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!proNumber) {
            res.status(400).json({ success: false, message: "PRO number is required" });
            return;
        }

        const proDetails = await warehouseReceiptService.getProHeaderDetailsService(conn, proNumber, userId);

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

export async function getAuditLogsForReceipt(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;
        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }
        const auditLogs = await warehouseReceiptService.getAuditLogsForReceiptService(conn, Number(receiptId));
        res.status(200).json({ success: true, data: auditLogs });
    } catch (error: any) {
        logger.error("Error fetching audit logs for receipt", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function updateWarehouseReceiptLocation(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;
        const { location } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }
        if (!location) {
            res.status(400).json({ success: false, message: "Location is required" });
            return;
        }
        await warehouseReceiptService.updateWarehouseReceiptLocationService(conn, Number(receiptId), location, userId);
        res.status(200).json({
            success: true,
            message: "Warehouse Receipt location updated successfully",
        });
    }
    catch (error: any) {
        logger.error("Error updating warehouse receipt location", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function warehouseReceiptAccountHold(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receiptIds } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptIds || !Array.isArray(receiptIds)) {
            res.status(400).json({ success: false, message: "Receipt IDs are required" });
            return;
        }

        // Update status for each receipt ID

        await warehouseReceiptService.warehouseReceiptAccountHoldService(conn, receiptIds, userId);

        res.status(200).json({
            success: true,
            message: "Warehouse Receipt statuses updated successfully",
        });
    }
    catch (error: any) {
        logger.error("Error updating warehouse receipt status", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function warehouseReceiptAccountHoldRevert(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receiptIds } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptIds || !Array.isArray(receiptIds)) {
            res.status(400).json({ success: false, message: "Receipt IDs are required" });
            return;
        }

        // Update status for each receipt ID

        await warehouseReceiptService.warehouseReceiptAccountHoldRevertService(conn, receiptIds, userId);

        res.status(200).json({
            success: true,
            message: "Warehouse Receipt statuses updated successfully",
        });
    }
    catch (error: any) {
        logger.error("Error updating warehouse receipt status", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function warehouseReceiptRateReadyForApproval(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const receiptId = req.query.receiptId;
        const rateDetail = req.body.rateDetails;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptId) {
            res.status(400).json({ success: false, message: "Receipt ID is required" });
            return;
        }

        if (!rateDetail) {
            res.status(400).json({ success: false, message: "rateDetails array is required" });
            return;
        }

        await warehouseReceiptService.warehouseReceiptRateReadyForApprovalService(conn, Number(receiptId), rateDetail, userId);

        res.status(200).json({
            success: true,
            message: "Warehouse Receipt statuses updated successfully",
        });
    }
    catch (error: any) {
        logger.error("Error updating warehouse receipt status", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function warehouseReceiptRateApprove(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { receiptIds } = req.body;
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!receiptIds || !Array.isArray(receiptIds)) {
            res.status(400).json({ success: false, message: "Receipt IDs are required" });
            return;
        }

        await warehouseReceiptService.warehouseReceiptRateApproveService(conn, receiptIds, userId);

        res.status(200).json({
            success: true,
            message: "Warehouse Receipt statuses updated successfully",
        });
    }
    catch (error: any) {
        logger.error("Error updating warehouse receipt status", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function exportWarehouseReceiptsToSpreadsheet(
    req: Request,
    res: Response,
    conn: Connection
): Promise<void> {
    try {

        console.log("Exporting warehouse receipts to spreadsheet with query params:", req.query);
        const status = req.query.status as string | undefined;
        const receiptNumber = req.query.receiptNumber as string | undefined;
        const accounting =
            req.query.accounting === "true"
                ? true
                : req.query.accounting === "false"
                    ? false
                    : undefined;

        const filters = {
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            customerId: req.query.customerId
                ? parseInt(req.query.customerId as string)
                : undefined,
            stationId: req.query.stationId
                ? parseInt(req.query.stationId as string)
                : undefined,
            carrierId: req.query.carrierId
                ? parseInt(req.query.carrierId as string)
                : undefined,
            location: req.query.location as string | undefined,
            proNumber: req.query.proNumber as string | undefined,
            verificationId: req.query.verificationId
                ? parseInt(req.query.verificationId as string)
                : undefined,
            destination: req.query.destination as string | undefined,
            packageId: req.query.packageId as string | undefined,
            customerRefNumber: req.query.customerRefNumber as string | undefined,
        };

        // Call service and stream workbook to response
        const workbook = await warehouseReceiptService.exportWarehouseReceiptsToSpreadsheetService(
            conn,
            status,
            receiptNumber,
            accounting,
            filters
        );

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=warehouse_receipts.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error: any) {
        logger.error("Error exporting warehouse receipts to spreadsheet", error);
        res
            .status(500)
            .json({ success: false, message: error.message || "Internal Server Error" });
    }
}

