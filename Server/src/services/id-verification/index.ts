import { Connection } from "odbc";
import * as idVerificationDB from "../../database/id-verification";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import { Driver, IDVerification, IDVerificationProDetail } from "../../entities/id-verification";
import { WarehouseReceiptTemp, WarehouseReceipt } from "../../entities/warehouse-receipt";

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
 * - Accepts carrier, doorNo, ID info, driverId, verifier
 * - Groups freight details by customer/station
 * - Creates one ID_Verification per customer/station
 * - Creates multiple ProDetails under each verification
 * - For each ProDetail, creates WarehouseReceiptTemp + WarehouseReceipt
 * - Validates duplicate carrier+proNumber before creating receipt
 */
export async function createVerificationService(
    conn: Connection,
    header: Omit<IDVerification, "verificationId" | "createdAt">,
    freightDetails: Omit<IDVerificationProDetail, "proDetailId" | "verificationId">[],
    userId: number
): Promise<{ verificationIds: number[] }> {
    await conn.beginTransaction();
    try {
        // Step 1: validate driver exists (must be created via driver check-in first)
        const driver = await idVerificationDB.getDriverById(conn, (header.driverId));
        if (!driver) {
            throw new Error(`Driver with ID ${header.driverId} not found. Please create driver via check-in first`);
        }
        const driverId = header.driverId;

        // Step 2: validate all freight details for duplicate carrier+proNumber upfront
        for (const detail of freightDetails) {
            const duplicate = await idVerificationDB.checkDuplicateCarrierProInVerification(conn, header.carrierId, detail.proNumber);
            if (duplicate) {
                throw new Error(`Duplicate record already exists in ID Verification for carrier ${header.carrierId} and PRO ${detail.proNumber}`);
            }
        }

        // Step 3: group freight details by customer+station
        const grouped = new Map<string, Omit<IDVerificationProDetail, "proDetailId" | "verificationId">[]>();
        for (const detail of freightDetails) {
            const key = `${detail.customerId}-${detail.stationId}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(detail);
        }

        const verificationIds: number[] = [];

        // Step 4: create one ID_Verification per group
        for (const [key, details] of grouped.entries()) {
            const verificationId = await idVerificationDB.createIDVerification(conn, { ...header, driverId, createdBy: userId });
            verificationIds.push(verificationId);

            // Step 5: create ProDetails + Warehouse Receipts
            for (const detail of details) {
                const proDetailId = await idVerificationDB.createProDetail(conn, { ...detail, verificationId });

                // Step 6: create WarehouseReceiptTemp
                const temp: Omit<WarehouseReceiptTemp, "receiptNumber" | "createdAt"> = {
                    verificationId,
                    receiptDate: new Date(),
                    shipper: detail.shipper,
                    customerId: detail.customerId,
                    stationId: detail.stationId,
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

                // Step 7: create WarehouseReceipt (without documentId initially)
                const receipt: Omit<WarehouseReceipt, "receiptId" | "receivedBy" | "location"> = {
                    receiptNumber,
                    receiptDate: new Date(),
                    shipper: detail.shipper,
                    customerId: detail.customerId,
                    stationId: detail.stationId,
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
                // Step 8: create WarehouseReceiptDocument with receiptId
                // const documentId = await warehouseReceiptDB.createWarehouseReceiptDocument(conn, receiptId);
                // Step 9: update WarehouseReceipt with documentId
                // await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, { documentId });
                // Step 10: create initial audit log for INITIATE status
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

    return { ...verification, driver, proDetails };
}
