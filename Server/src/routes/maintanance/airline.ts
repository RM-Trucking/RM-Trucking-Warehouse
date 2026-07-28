import { Router, Request, Response } from 'express';
import { db } from '../../config/db2';
import { authenticateJWT } from '../../middleware/auth';
import * as airlineController from '../../controllers/maintanance/airline';

const router = Router();

router.get('/export-dropdown', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await airlineController.listExportAirlinesDropdown(req, res, conn);
    if (conn) conn.close();
});

export default router;
