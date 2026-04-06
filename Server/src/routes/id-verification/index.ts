import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as idVerificationController from "../../controllers/id-verification";
import { db } from "../../config/db2";

const router = Router();

/**
 * DRIVER ENDPOINTS
 */

// Create driver check-in
router.post("/drivers", async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await idVerificationController.createDriver(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Get driver details
router.get("/drivers/:driverId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await idVerificationController.getDriver(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

/**
 * ID VERIFICATION ENDPOINTS
 */

// Create verification (stepper form)
router.post("/verify", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await idVerificationController.createVerification(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// List verifications with pagination
router.get("/verify", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await idVerificationController.listVerifications(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

// Get verification details with all related data
router.get("/verify/:verificationId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    try {
        await idVerificationController.getVerification(req, res, conn);
    } finally {
        if (conn) conn.close();
    }
});

export default router;
