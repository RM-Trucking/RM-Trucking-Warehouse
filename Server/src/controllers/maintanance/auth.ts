import { Request, Response } from 'express';
import { Connection } from 'odbc';
import { LoginRequest } from '../../entities/maintanance';
import * as authService from '../../services/maintanance';

export async function login(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { loginUserName, password } = req.body as LoginRequest;

        console.log(loginUserName, password);


        if (!loginUserName || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        const { accessToken, refreshToken, user } = await authService.loginUser(conn, { loginUserName, password });

        res.status(200).json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user
            }
        });
    } catch (error) {
        res.status(401).json({
            error: 'Authentication failed',
            message: (error as Error).message
        });
    }
}
