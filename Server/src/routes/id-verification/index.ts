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
    await idVerificationController.createDriver(req, res, conn);
    if (conn) conn.close();

});

// Get driver details
router.get("/drivers/:driverId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await idVerificationController.getDriver(req, res, conn);
    if (conn) conn.close();

});

/**
 * ID VERIFICATION ENDPOINTS
 */

// Create verification (stepper form)
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await idVerificationController.createVerification(req, res, conn);
    if (conn) conn.close();
});

// List verifications with pagination and advanced search/filters by names
// Query params: page, pageSize, driverId, carrierName, customerName, stationName, driverName, startDate, endDate, filterLogic
// filterLogic: "AND" (all filters must match) or "OR" (any filter matches). Default: "AND"
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await idVerificationController.listVerifications(req, res, conn);
    if (conn) conn.close();
});

// Get verification details with all related data
router.get("/:verificationId", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await idVerificationController.getVerification(req, res, conn);
    if (conn) conn.close();
});

export default router;
