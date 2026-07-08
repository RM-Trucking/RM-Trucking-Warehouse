import { Connection } from 'odbc';
import { NoteMessage } from '../../entities/maintanance';
import { SCHEMA } from '../../config/db2';
import { toUtcDate } from '../../utils/dateFormater';

/**
 * Create a new note thread
 */
export async function createWarehouseNoteThread(
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
  const result = (await conn.query(query, [parseInt(entityId.toString()), createdBy]) as unknown) as any[];
  return result[0]?.noteThreadId || 0;
}


export async function createNoteThread(
  conn: Connection,
  entityId: number,
  createdBy: number
): Promise<number> {
  const query = `
    SELECT "noteThreadId"
    FROM FINAL TABLE (
      INSERT INTO ${SCHEMA}."Note_Thread"
        ("entityId", "createdBy", "createdAt")
      VALUES (?, ?, (CURRENT_TIMESTAMP - CURRENT_TIMEZONE))
    )
  `;
  const result = (await conn.query(query, [parseInt(entityId.toString()), createdBy]) as unknown) as any[];
  return result[0]?.noteThreadId || 0;
}


/**
 * Create a new note message
 */
export async function createWarehouseNoteMessage(
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
  await conn.query(query, [parseInt(noteThreadId.toString()), messageText, createdBy]);

  const resultQuery = `
        SELECT "noteMessageId"
        FROM ${SCHEMA}."Warehouse_Note_Message"
        WHERE "noteThreadId" = ?
        ORDER BY "noteMessageId" DESC
        FETCH FIRST 1 ROWS ONLY
    `;
  const result = (await conn.query(resultQuery, [parseInt(noteThreadId.toString())]) as unknown) as any[];
  return Number(result[0]?.noteMessageId) || 0;
}

/**
 * Get all messages for a thread
 */
export async function getWarehouseMessagesByThread(
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

  const result = (await conn.query(query, [Number(noteThreadId)]) as unknown) as any[];

  const notes: (NoteMessage & { createdByName: string })[] = result.map(row => ({
    noteMessageId: Number(row.noteMessageId),
    noteThreadId: Number(row.noteThreadId),
    messageText: row.messageText,
    createdAt: row.createdAt ? toUtcDate(row.createdAt) : null,
    createdBy: row.createdBy,
    createdByName: row.createdByName || `User-${row.createdBy}`
  }));

  return notes;
}

/**
 * Update a note message
 */
export async function updateWarehouseNoteMessage(
  conn: Connection,
  noteMessageId: number,
  messageText: string,
  userId: number
): Promise<void> {
  const query = `
    UPDATE ${SCHEMA}."Warehouse_Note_Message"
    SET "messageText" = ?, "updatedAt" = (CURRENT_TIMESTAMP - CURRENT_TIMEZONE), "updatedBy" = ?
    WHERE "noteMessageId" = ?
  `;
  await conn.query(query, [messageText, userId, Number(noteMessageId)]);
}

/**
 * Get notes by thread (service layer function)
 */
export async function getNotesByThreadService(
  conn: Connection,
  noteThreadId: number
): Promise<(NoteMessage & { createdByName: string })[]> {
  return await getWarehouseMessagesByThread(conn, noteThreadId);
}
