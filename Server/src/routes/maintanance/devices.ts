import { Router, Request, Response } from 'express';
import { authenticateJWT } from "../../middleware/auth";
import * as devicesController from "../../controllers/maintanance/devices";
import { db } from "../../config/db2";

const router = Router();

router.get("/cargo-api-dropdown", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await devicesController.getCargoAPIDropdown(req, res, conn);
    if (conn) conn.close();
});

router.get("/cargo-api-dimensions", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await devicesController.getDimentionsFromCargoAPI(req, res, conn);
    if (conn) conn.close();
});

router.get("/printers-dropdown", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await devicesController.getPrintersDropdown(req, res, conn);
    if (conn) conn.close();
});

export default router;