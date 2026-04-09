import { Connection } from 'odbc';
import { NoteMessage } from '../../entities/maintanance';
import { SCHEMA } from '../../config/db2';

/**
 * Create a new note thread
 */
export async function createNoteThread(
    conn: Connection,
    entityId: number,
    createdBy: number
): Promise<number> {
    const query = `
    SELECT "noteThreadId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Warehouse_Note_Thread"
        ("entityId", "createdBy", "createdAt")
      VALUES (?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
    )
  `;
    const result = (await conn.query(query, [parseInt(entityId.toString()), createdBy])) as any[];
    return result[0]?.noteThreadId || 0;
}


/**
 * Create a new note message
 */
export async function createNoteMessage(
    conn: Connection,
    noteThreadId: number,
    messageText: string,
    createdBy: number
): Promise<number> {
    const query = `
        INSERT INTO ${SCHEMA}."Warehouse_Note_Message"
        ("noteThreadId", "messageText", "createdBy", "createdAt")
        VALUES (?, ?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
    `;
    await conn.query(query, [noteThreadId, messageText, createdBy]);

    const resultQuery = `
        SELECT "noteMessageId"
        FROM ${SCHEMA}."Warehouse_Note_Message"
        WHERE "noteThreadId" = ?
        ORDER BY "noteMessageId" DESC
        FETCH FIRST 1 ROWS ONLY
    `;
    const result = (await conn.query(resultQuery, [noteThreadId])) as any[];
    return result[0]?.noteMessageId || 0;
}

/**
 * Get all messages for a thread
 */
export async function getMessagesByThread(
    conn: Connection,
    noteThreadId: number
): Promise<(NoteMessage & { createdByName: string })[]> {
    const query = `
    SELECT nm."noteMessageId",
           nm."noteThreadId",
           nm."messageText",
           nm."createdAt",
           nm."createdBy",
           u."userName" AS "createdByName"
    FROM ${SCHEMA}."Warehouse_Note_Message" nm
    LEFT JOIN ${SCHEMA}."User" u
      ON nm."createdBy" = u."userId"
    WHERE nm."noteThreadId" = ?
    ORDER BY nm."createdAt" DESC
  `;

    const result = (await conn.query(query, [noteThreadId])) as any[];
    return result as (NoteMessage & { createdByName: string })[];
}

// database/maintenance/note.ts
export async function updateNoteMessage(
    conn: Connection,
    noteId: number,
    messageText: string,
    userId: number
): Promise<void> {
    const query = `
    UPDATE ${SCHEMA}."Warehouse_Note_Message"
    SET "messageText" = ?, "updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), "updatedBy" = ?
    WHERE "noteId" = ?
  `;
    await conn.query(query, [messageText, userId, noteId]);
}
