import { Request, Response } from 'express';
import { Connection } from 'odbc';
import * as noteService from '../../services/maintanance';

export async function addNote(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const userId = (req as any).user?.userId || 1;
        const { noteThreadId, messageText } = req.body;

        if (!noteThreadId || !messageText) {
            res.status(400).json({ error: 'noteThreadId and messageText are required' });
            return;
        }

        const note = await noteService.addNoteService(conn, Number(noteThreadId), messageText, userId);
        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(400).json({
            error: 'Failed to add note',
            message: (error as Error).message
        });
    }
}

export async function getNotesByThread(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { noteThreadId } = req.params;

        // Ensure it's a string before parsing
        const id = Array.isArray(noteThreadId) ? noteThreadId[0] : noteThreadId;

        const notes = await noteService.getNotesByThreadService(conn, Number(id));
        res.status(200).json({ success: true, data: notes });
    } catch (error) {
        res.status(400).json({
            error: 'Failed to fetch notes',
            message: (error as Error).message
        });
    }
}
