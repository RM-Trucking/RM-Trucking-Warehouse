import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';

export interface Entity {
    entityId: number;
    entityType: string;
    entityName: string;
}

/**
 * Create a new entity
 */
export async function createEntity(
    conn: Connection,
    entityType: 'WAREHOUSE_RECEIPT' | 'ID_VERIFICATION',
    entityName: string
): Promise<number> {
    const query = `
        SELECT "entityId"
        FROM FINAL TABLE (
            INSERT INTO ${SCHEMA}."Warehouse_Entity"
                ("entityType", "entityName")
            VALUES (?, ?)
        )
    `;

    const result = (await conn.query(query, [entityType, entityName])) as any[];
    return result[0]?.entityId || 0;
}
