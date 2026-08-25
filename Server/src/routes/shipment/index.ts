import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { db } from "../../config/db2";
import * as shipmentController from "../../controllers/shipment";

const router = Router();

router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.listShipments(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.get("/scan-freight", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.scanFreight(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.get("/unscan-freight", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.unscanFreight(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.get("/:id", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.getShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.get("/:id/for-pickup", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.getShipmentForPickup(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.post("/pickup-entry", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.createShipmentPickupEntry(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.createShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.post("/sign-off", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.signOffShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.put("/:id", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.updateShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.put("/:shipmentId/receipts/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.addReceiptToShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.delete("/:shipmentId/receipts/:receiptId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.removeReceiptFromShipment(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

router.post("/split-approval", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.shipmentSplitApproval(req, res, conn);
    }
    finally {
        if (conn) conn.close();
    }
});

router.post("/complete", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.completeShipment(req, res, conn);
    }
    finally {
        if (conn) conn.close();
    }
});

router.post("/revoke-completion", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await shipmentController.revokeShipmentCompletion(req, res, conn);
    }
    finally {
        if (conn) conn.close();
    }
});


export default router;
