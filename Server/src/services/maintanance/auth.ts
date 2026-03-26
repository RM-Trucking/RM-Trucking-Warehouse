import { Connection } from 'odbc';
import jwt from 'jsonwebtoken';
import { LoginRequest, UserResponse } from '../../entities/maintanance/auth';
import { verifyStoredPassword } from '../../utils/password';
import * as authDB from '../../database/maintanance';

const JWT_SECRET: string = process.env.TOKEN_SECRET || 'your-secret-key';
const REFRESH_SECRET: string = process.env.REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '36000s';
const REFRESH_EXPIRY: string = process.env.REFRESH_EXPIRY || '7d';


export async function loginUser(conn: Connection, loginReq: LoginRequest): Promise<{ accessToken: string; refreshToken: string; user: UserResponse }> {
    const user = await authDB.getUserByLoginUsername(conn, loginReq.loginUserName);

    console.log(user);


    if (!user) {
        throw new Error('Invalid username or password');
    }

    if (user.activeStatus !== 'Y') {
        throw new Error(`User account is inactive`);
    }

    // Verify password
    if (!verifyStoredPassword(loginReq.password, user.passwordHash)) {
        throw new Error('Invalid username or password');
    }

    // Generate access token
    const tokenPayload: any = {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        roleId: user.roleId
    };

    console.log(JWT_EXPIRY);


    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);

    console.log("System time:", new Date().toISOString());
    console.log(jwt.decode(accessToken));



    // Generate refresh token (as JWT)
    const refreshTokenPayload = {
        userId: user.userId,
        type: 'refresh'
    };
    const refreshToken = jwt.sign(refreshTokenPayload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY } as any);

    // Store refresh token in database
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days
    // await userDB.storeRefreshToken(conn, user.userId, refreshToken, refreshExpiresAt);

    return {
        accessToken,
        refreshToken,
        user: user
    };
}
