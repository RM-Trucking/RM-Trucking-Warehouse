import { Request, Response } from 'express';
import * as devicesService from '../../services/maintanance';
import { Connection } from 'odbc';

export async function getCargoAPIDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const dropdownData = await devicesService.getCargoAPIDropdown(conn);
        res.status(200).json(
            { success: true, data: dropdownData }
        );
    } catch (error) {
        console.error('Error fetching Cargo API dropdown:', error);
        res.status(500).json({ error: 'Failed to fetch Cargo API dropdown' });
    }
}

export async function getDimentionsFromCargoAPI(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const apiId = Number(req.query.apiId);
        if (isNaN(apiId)) {
            res.status(400).json({ error: 'Invalid apiId parameter' });
            return;
        }
        const result = await devicesService.getDimentionsFromCargoAPI(conn, apiId);

        if (result) {
            res.status(200).json({ success: true, data: result });
        }
        else {
            res.status(404).json({ success: false, message: 'Cargo API not found' });
        }
    } catch (error) {
        console.error('Error fetching Cargo API dimensions:', error);
        res.status(500).json({ error: 'Failed to fetch Cargo API dimensions' });
    }
}

export async function getPrintersDropdown(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const dropdownData = await devicesService.getPrintersDropdown(conn);
        res.status(200).json(
            { success: true, data: dropdownData }
        );
    } catch (error) {
        console.error('Error fetching Printers dropdown:', error);
        res.status(500).json({ error: 'Failed to fetch Printers dropdown' });
    }
}