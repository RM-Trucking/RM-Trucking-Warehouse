import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as warehouseReceiptController from "../../controllers/warehouse-receipt";
import { uploaders } from "../../config/multer";
import { db } from "../../config/db2";

const router = Router();

/**
 * WAREHOUSE RECEIPT ENDPOINTS
 */

// ===== SPECIFIC POST ENDPOINTS (ACTION ROUTES) =====

// Create temporary warehouse receipt
router.post("/temp", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.createTemporaryWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

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

router.post("/document-upload", authenticateJWT, uploaders.warehouse.documents.any(), async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.uploadWarehouseReceiptDocuments(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.delete("/document-remove", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.removeWarehouseReceiptDocuments(req, res, conn);
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

router.post("/rate-ready-for-approval", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.warehouseReceiptRateReadyForApproval(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// ===== SPECIFIC PUT ENDPOINTS (ACTION ROUTES) =====

router.put("/account-hold", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.warehouseReceiptAccountHold(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.put("/account-hold-revert", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.warehouseReceiptAccountHoldRevert(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.put("/rate-approve", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.warehouseReceiptRateApprove(req, res, conn);
    } finally {
        if (conn) await conn.close();
    }
});

// ===== SPECIFIC GET ENDPOINTS (EXACT PATHS) =====

// Get PRO header details for a given PRO number
router.get("/pro-detail/:pro", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getProHeaderDetails(req, res, conn);
    if (conn) conn.close();
});

// Export receipts to spreadsheet
router.get("/export-spreadsheet", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.exportWarehouseReceiptsToSpreadsheet(req, res, conn);
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

// ===== SPECIFIC GET ENDPOINTS (WITH ID SUBPATHS) =====

// Get receipt summary (status, totals, counts)
router.get("/:receiptId/summary", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getReceiptSummary(req, res, conn);
    if (conn) conn.close();
});

router.get("/:receiptId/audit-logs", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getAuditLogsForReceipt(req, res, conn);
    if (conn) conn.close();
});

// ===== GENERIC GET ENDPOINTS (LIST & RETRIEVE) =====

// List receipts with pagination and filters
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.listWarehouseReceipts(req, res, conn);
    if (conn) conn.close();
});

// Get receipt with all details (freight, rate, audit logs)
// Supports search by receiptId (default) or proNumber via ?searchBy=proNumber query parameter
router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.getWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

// ===== PUT/PATCH ENDPOINTS (UPDATE ROUTES) =====

// Create warehouse receipt with freight info
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.createWarehouseReceiptWithFreight(req, res, conn);
    if (conn) conn.close();
});

// Update receipt with support for file and Base64 image uploads
router.put("/:id", authenticateJWT, uploaders.warehouse.combinedImages.any(), async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.updateWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

router.patch("/:receiptId/location", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.updateWarehouseReceiptLocation(req, res, conn);
    if (conn) conn.close();
});

router.put("/:receiptId/reject", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.rejectWarehouseReceipt(req, res, conn);
    if (conn) conn.close();
});

router.post("/send-email", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await warehouseReceiptController.sendWarehouseReceiptToCustomEmail(req, res, conn);
    if (conn) conn.close();
});

export default router;
