import { Connection } from 'odbc';
import * as noteDB from '../../database/maintanance';
import { toUtcDate } from '../../utils/dateFormater';
import { NoteMessage } from '../../entities/maintanance';

export async function addNoteService(
    conn: Connection,
    noteThreadId: number,
    messageText: string,
    userId: number
): Promise<NoteMessage> {
    const noteMessageId = await noteDB.createWarehouseNoteMessage(conn, noteThreadId, messageText, userId);
    const notes = await noteDB.getWarehouseMessagesByThread(conn, noteThreadId);
    // Return the newly created note message
    const newNote = notes.find(n => n.noteMessageId === noteMessageId);
    if (!newNote) throw new Error('Failed to create note');
    return {
        ...newNote,
        createdAt: newNote.createdAt ? toUtcDate(newNote.createdAt) : null

    };
}

export async function getNotesByThreadService(
    conn: Connection,
    noteThreadId: number
): Promise<NoteMessage[]> {
    const notes = await noteDB.getWarehouseMessagesByThread(conn, noteThreadId);

    return notes.map(n => ({
        ...n,
        createdAt: n.createdAt ? toUtcDate(n.createdAt) : null
    }));
}

