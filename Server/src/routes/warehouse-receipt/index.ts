import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as warehouseReceiptController from "../../controllers/warehouse-receipt";
import { upload } from "../../config/multer";
import { db } from "../../config/db2";

const router = Router();

/**
 * WAREHOUSE RECEIPT ENDPOINTS
 */

// Create temporary warehouse receipt
router.post("/temp", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.createTemporaryWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

// Batch process: Update reference receipt and create multiple new receipts
// Supports both JSON and multipart/form-data with images
router.post("/batch", authenticateJWT, upload.any(), async (req: Request, res: Response) => {
    const conn = await db();
    try {
        // Check if images are present in request
        const hasImages = (req as any).files && (req as any).files.length > 0;
        if (hasImages) {
            await warehouseReceiptController.batchProcessWarehouseReceiptsWithImages(req, res, conn);
        } else {
            await warehouseReceiptController.batchProcessWarehouseReceipts(req, res, conn);
        }
    } finally {
        if (conn) conn.close();
    }
});

// Create warehouse receipt with freight info
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.createWarehouseReceiptWithFreight(req, res, conn);
    if (conn) conn.close();
});

// Get receipt with all details (freight, rate, audit logs)
router.get("/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

// List receipts with pagination and filters
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.listWarehouseReceipts(req, res, conn);
    if (conn) conn.close();
});

// Get receipts by verification ID
router.get("/verification/:verificationId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getReceiptsByVerification(req, res, conn);
    if (conn) conn.close();
});

// Get receipts by customer & station
router.get("/customer-station", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getReceiptsByCustomerStation(req, res, conn);
    if (conn) conn.close();
});

// Get receipt summary (status, totals, counts)
router.get("/:receiptId/summary", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getReceiptSummary(req, res, conn);
    if (conn) conn.close();
});

// Update receipt
router.put("/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.updateWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

export default router;
