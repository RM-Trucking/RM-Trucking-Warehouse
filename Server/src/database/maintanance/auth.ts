import { Connection } from 'odbc';
import { SCHEMA } from '../../config/db2';
import { User } from '../../entities/maintanance';

export async function getUserByLoginUsername(conn: Connection, loginUserName: string): Promise<User | null> {
    const query = `
        SELECT "userId", "userName", "loginUserName", "email", "passwordHash", "createdAt", "createdBy", "activeStatus", "roleId", "userType", "customerId"
        FROM ${SCHEMA}."User"
        WHERE "loginUserName" = ?
    `;

    const result = (await conn.query(query, [loginUserName.toUpperCase()])) as User[];
    return result[0];
}

export async function getUserName(conn: Connection, userId: number): Promise<string> {
    const query = `SELECT "userName" FROM ${SCHEMA}."User" WHERE "userId" = ?`;
    const result = await conn.query(query, [userId]) as any[];
    return result.length ? result[0].userName : `User-${userId}`;
}
