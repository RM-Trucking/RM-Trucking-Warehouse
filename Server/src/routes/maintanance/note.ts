import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { db } from '../../config/db2';
import * as noteController from '../../controllers/maintanance/note';

const router = Router();

// Add new note
router.post('/', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await noteController.addNote(req, res, conn);
    if (conn) conn.close();
});

// Get notes by threadId
router.get('/:noteThreadId', authenticateJWT, async (req: Request, res: Response) => {
    const conn = await db();
    await noteController.getNotesByThread(req, res, conn);
    if (conn) conn.close();
});

export default router;
