import { Router, Request, Response } from 'express';
import { db } from '../../config/db2';
import { authenticateJWT } from '../../middleware/auth';
import * as customerController from '../../controllers/maintanance/customer';

const router = Router();

router.get('/dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await customerController.getCustomerWithStationDropdown(req, res, conn);
    if (conn) conn.close();
});

router.get('/customer-dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await customerController.getCustomerDropdown(req, res, conn);
    if (conn) conn.close();
});

router.get('/station-dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await customerController.getStationDropdown(req, res, conn);
    if (conn) conn.close();
});

export default router;