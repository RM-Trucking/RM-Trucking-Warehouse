import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as warehouseReceiptController from "../../controllers/warehouse-receipt";
import { db } from "../../config/db2";

const router = Router();

/**
 * WAREHOUSE RECEIPT ENDPOINTS
 */

// Get receipt with all details (freight, rate, audit logs)
router.get("/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.getWarehouseReceipt(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// List receipts with pagination and filters
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.listWarehouseReceipts(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Get receipts by verification ID
router.get("/verification/:verificationId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.getReceiptsByVerification(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Get receipts by customer & station
router.get("/customer-station", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.getReceiptsByCustomerStation(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Get receipt summary (status, totals, counts)
router.get("/:receiptId/summary", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.getReceiptSummary(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Update receipt
router.put("/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await warehouseReceiptController.updateWarehouseReceipt(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

export default router;
