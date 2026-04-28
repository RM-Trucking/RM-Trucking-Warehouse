import { Request, Response } from "express";
import { Connection } from "odbc";
import * as idVerificationService from "../../services/id-verification";
import { Logger } from "../../utils/logger";

const logger = new Logger("IDVerificationController");

/**
 * CREATE DRIVER CHECK-IN
 * Endpoint: POST /id-verification/drivers
 */
export async function createDriver(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { driverName, signaturePath } = req.body;

        if (!driverName) {
            res.status(400).json({ success: false, message: "Driver name is required" });
            return;
        }

        const result = await idVerificationService.createDriverService(conn, {
            driverName,
            driverSignature: signaturePath || null
        });

        res.status(201).json({
            success: true,
            message: "Driver created successfully",
            data: result
        });
    } catch (error: any) {
        console.log(error);

        logger.error("Error creating driver", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET DRIVER DETAILS
 * Endpoint: GET /id-verification/drivers/:driverId
 */
export async function getDriver(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const driverId = Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId;

        if (!driverId) {
            res.status(400).json({ success: false, message: "Driver ID is required" });
            return;
        }

        const driver = await idVerificationService.getDriverService(conn, Number(driverId));

        if (!driver) {
            res.status(404).json({ success: false, message: "Driver not found" });
            return;
        }

        res.status(200).json({ success: true, data: driver });
    } catch (error: any) {
        logger.error("Error fetching driver", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * CREATE VERIFICATION FLOW
 * Endpoint: POST /id-verification/verify
 * 
 * Request body:
 * {
 *   "header": { carrierId, doorNo, firstIdType, firstIdPhotoMatch, secondIdType, secondIdPhotoMatch, driverId (required), verifiedByEmployee, createdBy },
 *   "freightDetails": [ { customerId, stationId, pieces, weight, shipper }, ... ]
 * }
 * 
 * Flow:
 * 1. Driver checks in via /drivers endpoint → receives driverId
 * 2. Pass that driverId in header of this verification form
 * 3. On retrieval, driver name and signature are fetched from Driver table
 */
export async function createVerification(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const { header, freightDetails } = req.body;
        const userId = (req as any).user?.userId || 1; // Assuming user info is added to req by auth middleware

        // Validation
        if (!header) {
            res.status(400).json({ success: false, message: "Header information is required" });
            return;
        }

        const requiredFields = [
            "carrierId",
            "firstIdType",
            "verifiedByEmployee",
            "driverName",
            "driverSignature"
        ];

        const missing = requiredFields.filter(field => !header[field]);

        if (missing.length > 0) {
            res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(", ")}`
            });
            return;
        }


        if (!freightDetails || !Array.isArray(freightDetails) || freightDetails.length === 0) {
            res.status(400).json({ success: false, message: "Freight details are required" });
            return;
        }

        // Validate freight details
        for (const detail of freightDetails) {
            if (!detail.customerId || !detail.stationId || !detail.pieces || !detail.weight) {
                res.status(400).json({
                    success: false,
                    message: "Each freight detail must have: customerId, stationId, pieces, weight"
                });
                return;
            }
        }

        // Create verification
        const result = await idVerificationService.createVerificationService(
            conn,
            {
                ...header,
                firstIdPhotoMatch: header.firstIdPhotoMatch == 'Y' ? 'Y' : 'N',
                secondIdPhotoMatch: header.secondIdPhotoMatch == 'Y' ? 'Y' : 'N',
            },
            freightDetails,
            userId
        );

        res.status(201).json({
            success: true,
            message: "ID Verification created successfully",
            data: result
        });
    } catch (error: any) {
        console.log(error);

        logger.error("Error creating verification", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * LIST VERIFICATIONS WITH PAGINATION
 * Endpoint: GET /id-verification/verify?page=1&pageSize=10
 */
export async function listVerifications(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;

        const result = await idVerificationService.listVerificationService(conn, page, pageSize);

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                pageSize: result.pageSize
            }
        });
    } catch (error: any) {
        logger.error("Error listing verifications", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET VERIFICATION DETAILS WITH ALL RELATED DATA
 * Endpoint: GET /id-verification/verify/:verificationId
 */
export async function getVerification(req: Request, res: Response, conn: Connection): Promise<void> {
    try {
        const verificationId = Array.isArray(req.params.verificationId) ? req.params.verificationId[0] : req.params.verificationId;

        if (!verificationId) {
            res.status(400).json({ success: false, message: "Verification ID is required" });
            return;
        }

        const data = await idVerificationService.getVerificationService(conn, Number(verificationId));

        console.log(data)

        if (!data) {
            res.status(404).json({ success: false, message: "Verification not found" });
            return;
        }

        res.status(200).json({ success: true, data });
    } catch (error: any) {
        logger.error("Error fetching verification", error);
        res.status(500).json({ success: false, message: error.message });
    }
}
