import { Router, Request, Response } from 'express';
import { db } from '../../config/db2';
import { authenticateJWT } from '../../middleware/auth';
import * as carrierController from '../../controllers/maintanance/carrier';

const router = Router();

router.post("/", authenticateJWT, async (req, res) => {
    const conn = await db();
    await carrierController.createCarrier(req, res, conn);
    conn.close();
});


router.get('/dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await carrierController.listCarrierDropdown(req, res, conn);
    if (conn) conn.close();
});

router.get('/parcel-dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await carrierController.listParcelCarrierDropdown(req, res, conn);
    if (conn) conn.close();
});

export default router;