import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import * as enrouteController from "../../controllers/en-route";
import { db } from '../../config/db2';

const router = Router();

// 1. Create Enroute with multiple PROs
router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.createEnroute(req, res, conn);
    if (conn) conn.close();
});

// 2. List all Enroutes with PROs
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.listEnroutes(req, res, conn);
    if (conn) conn.close();
});

// 3. Verify PRO by carrier + proNumber
router.get("/verify", authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.verifyPro(req, res, conn);
    if (conn) conn.close();
});

export default router;
