import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as warehouseReceiptController from "../../controllers/warehouse-receipt";
import { uploaders } from "../../config/multer";
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
// router.post("/batch", authenticateJWT, upload.any(), async (req: Request, res: Response) => {
//     const conn = await db();
//     try {
//         // Check if images are present in request
//         const hasImages = (req as any).files && (req as any).files.length > 0;
//         if (hasImages) {
//             await warehouseReceiptController.batchProcessWarehouseReceiptsWithImages(req, res, conn);
//         } else {
//             await warehouseReceiptController.batchProcessWarehouseReceiptsWithoutImages(req, res, conn);
//         }
//     } finally {
//         if (conn) conn.close();
//     }
// });

// Batch process V2 (Hybrid Image Uploads): Update reference receipt and create multiple new receipts
// Supports standard JSON, multipart/form-data with actual file images, and Base64 strings sent as text fields
// Accepts both freight and bad freight images in same request using different field names
router.post("/batch", authenticateJWT, uploaders.warehouse.combinedImages.any(), async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.batchProcessWarehouseReceipts(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Print label via ZPL
router.post("/label-print", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.printLabel(req, res, conn);
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
// Supports search by receiptId (default) or proNumber via ?searchBy=proNumber query parameter
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

// Get PRO header details for a given PRO number
router.get("/pro-detail/:pro", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getProHeaderDetails(req, res, conn);
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

router.put("/:receiptId/reject", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.rejectWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});



export default router;
