import { Connection } from "odbc";
import * as idVerificationDB from "../../database/id-verification";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as userDB from "../../database/maintanance/auth";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import { CreateIDVerification, CreateProDetail, Driver, IDVerification, IDVerificationProDetail, FreightDetailInput } from "../../entities/id-verification";
import { WarehouseReceiptTemp, WarehouseReceipt } from "../../entities/warehouse-receipt";
import { create } from "node:domain";
import { toUtcDate } from "../../utils/dateFormater";



/**
 * DRIVER SERVICES
 */
export async function createDriverService(conn: Connection, driver: Omit<Driver, "driverId">): Promise<{ driverId: number }> {
    const driverId = await idVerificationDB.createDriver(conn, driver);
    return { driverId };
}

export async function getDriverService(conn: Connection, driverId: number): Promise<Driver | null> {
    return await idVerificationDB.getDriverById(conn, driverId);
}

/**
 * VERIFICATION CREATION FLOW
 * - Accepts carrier, customer, station, ID info, driverId, verifier
 * - Validates duplicate carrier+proNumber upfront
 * - Creates one ID_Verification per customer/station
 * - Creates multiple ProDetails under the verification
 * - For each ProDetail, creates WarehouseReceiptTemp + WarehouseReceipt
 */
export async function createVerificationService(
    conn: Connection,
    header: CreateIDVerification,
    freightDetails: FreightDetailInput[],
    userId: number
): Promise<{ verificationIds: number[] }> {
    await conn.beginTransaction();
    try {
        // Step 1: Create driver from header info
        const driverId = await idVerificationDB.createDriver(conn, { driverName: header.driverName, driverSignature: header.driverSignature });

        // Step 2: Validate all freight details for duplicate carrier+proNumber upfront
        for (const detail of freightDetails) {
            const duplicate = await idVerificationDB.checkDuplicateCarrierProInVerification(conn, header.carrierId, detail.proNumber);
            if (duplicate) {
                throw new Error(`Duplicate record already exists in ID Verification for carrier ${header.carrierId} and PRO ${detail.proNumber}`);
            }
        }

        // Step 3: Group freight details by customer+station to identify number of verifications needed
        const grouped = new Map<string, FreightDetailInput[]>();
        for (const detail of freightDetails) {
            const key = `${detail.customerId}-${detail.stationId}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(detail);
        }

        const verificationIds: number[] = [];

        // Step 4: Create one ID_Verification per customer+station group
        for (const [key, details] of grouped) {
            const [customerId, stationId] = key.split('-').map(Number);
            // Extract toEmails from first detail in group (all same for this station)
            const toEmails = details[0]?.toEmails;

            // Create verification with customer/station info
            const verificationId = await idVerificationDB.createIDVerification(conn, {
                carrierId: header.carrierId,
                customerId,
                stationId,
                doorNo: header.doorNo,
                firstIdType: header.firstIdType,
                firstIdPhotoMatch: header.firstIdPhotoMatch,
                secondIdType: header.secondIdType,
                secondIdPhotoMatch: header.secondIdPhotoMatch,
                driverId,
                verifiedByEmployee: header.verifiedByEmployee,
                createdBy: userId,
                driverName: header.driverName,
                driverSignature: header.driverSignature,
                toEmails,
            });
            verificationIds.push(verificationId);

            // Step 5: Create ProDetails + Warehouse Receipts for each detail in this group
            for (const detail of details) {
                // Create ProDetail (no customerId/stationId needed - they're in ID_Verification)
                const proDetailId = await idVerificationDB.createProDetail(conn, {
                    verificationId,
                    pieces: detail.pieces,
                    weight: detail.weight,
                    shipper: detail.shipper,
                    proNumber: detail.proNumber,
                });

                // Step 6: Create WarehouseReceiptTemp
                const temp: Omit<WarehouseReceiptTemp, "receiptNumber" | "createdAt"> = {
                    verificationId,
                    receiptDate: new Date(),
                    shipper: detail.shipper,
                    customerId,
                    stationId,
                    carrierId: header.carrierId,
                    createdBy: userId,
                    status: "INITIATE",
                    destination: null,
                    proNumber: detail.proNumber,
                    packageId: null,
                    receivedBy: null,
                    location: null
                };
                const receiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn, temp);
                const entityId = await entityDB.createEntity(conn, 'WAREHOUSE_RECEIPT', receiptNumber.toString());
                const noteThreadId = await noteDB.createNoteThread(conn, entityId, userId);

                // Step 7: Create WarehouseReceipt
                const receipt: Omit<WarehouseReceipt, "receiptId" | "receivedBy" | "location"> = {
                    receiptNumber,
                    receiptDate: new Date(),
                    shipper: detail.shipper,
                    customerId,
                    stationId,
                    verificationId,
                    createdAt: new Date(),
                    createdBy: userId,
                    carrierId: header.carrierId,
                    piecesInland: detail.pieces,
                    weightInland: detail.weight,
                    proNumber: detail.proNumber,
                    status: "INITIATE",
                    entityId: entityId,
                    noteThreadId: noteThreadId
                };

                const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, receipt);

                console.log("Receipt ID:", receiptId);


                // Step 8: Create initial audit log for INITIATE status
                await warehouseReceiptDB.createAuditLog(conn, {
                    receiptNumber,
                    receiptId,
                    proNumber: detail.proNumber,
                    userId: userId,
                    status: "INITIATE",
                    description: `Receipt created for verification ID ${verificationId}`,
                    level: "INFO"
                });
            }
        }

        await conn.commit();
        return { verificationIds };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

/**
 * LIST VERIFICATIONS
 */
export async function listVerificationService(conn: Connection, page: number = 1, pageSize: number = 10) {
    const offset = (page - 1) * pageSize;
    const data = await idVerificationDB.listIDVerifications(conn, pageSize, offset);
    return { data, page, pageSize };
}

/**
 * GET VERIFICATION WITH DRIVER + PRO DETAILS + RECEIPTS
 */
export async function getVerificationService(conn: Connection, id: number) {
    const verification = await idVerificationDB.getIDVerificationById(conn, id);
    if (!verification) return null;

    const driver = await idVerificationDB.getDriverById(conn, verification.driverId);
    const proDetails = await idVerificationDB.getProDetailsByVerification(conn, id);
    // const receipts = await warehouseReceiptDB.getWarehouseReceiptsByVerification(conn, id);

    return {
        ...verification,
        createdAt: verification.createdAt ? toUtcDate(verification.createdAt) : null,
        createdByName: await userDB.getUserName(conn, verification.createdBy),
        driver,
        proDetails
    };
}
