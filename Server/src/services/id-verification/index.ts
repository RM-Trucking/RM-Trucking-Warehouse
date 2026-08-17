import { Connection } from "odbc";
import * as idVerificationDB from "../../database/id-verification";
import * as enrouteDB from "../../database/en-route";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as userDB from "../../database/maintanance/auth";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import { CreateIDVerification, CreateProDetail, Driver, IDVerification, IDVerificationProDetail, FreightDetailInput, ReceiptSummary } from "../../entities/id-verification";
import { WarehouseReceiptTemp, WarehouseReceipt } from "../../entities/warehouse-receipt";
import { create } from "node:domain";
import { toUtcDate } from "../../utils/dateFormater";
import { emitEmail, emitAuditLog } from "../../utils/email";



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
): Promise<{ verificationIds: number[], receipts: ReceiptSummary[] }> {
    await conn.beginTransaction();
    try {
        // Step 1: Create driver from header info
        const driverId = await idVerificationDB.createDriver(conn, { driverName: header.driverName, driverSignature: header.driverSignature });

        // Step 2: Validate all freight details for duplicate carrier+proNumber upfront
        // Allow creation only if duplicate status is REJECTED, otherwise prevent duplicate
        for (const detail of freightDetails) {
            const duplicateRecord = await idVerificationDB.getDuplicateCarrierProWithStatus(conn, header.carrierId, detail.proNumber);
            if (duplicateRecord) {
                // If status is REJECTED, allow reuse; otherwise throw error
                if (duplicateRecord.status !== 'REJECTED') {
                    throw new Error(
                        `Duplicate record already exists for carrier ${header.carrierId} and PRO ${detail.proNumber} with status ${duplicateRecord.status}. Can only reuse REJECTED records.`
                    );
                }
                // If REJECTED, allow it to be recreated
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
        const receiptIds: number[] = [];

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
                shipperCompanyName: header.shipperCompanyName,
                driverId,
                verifiedByEmployee: header.verifiedByEmployee,
                createdBy: userId,
                toEmails,
            });
            verificationIds.push(verificationId);

            // Step 5: Create ProDetails + Warehouse Receipts for each detail in this group
            for (const detail of details) {
                // Inactivate linked enroute PRO if exists to prevent reuse
                if (detail.proDetailId && detail.proDetailId !== 0) {
                    await enrouteDB.inactivatePro(conn, detail.proDetailId);
                }
                //Create ProDetail record linked to this verification
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
                    status: "INITIATED",
                    destination: null,
                    proNumber: detail.proNumber,
                    packageId: null,
                    receivedBy: null,
                    location: null
                };
                const receiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn, temp);
                const entityId = await entityDB.createWarehouseEntity(conn, 'WAREHOUSE_RECEIPT', receiptNumber.toString());
                const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

                // Step 7: Create WarehouseReceipt
                const receipt: Omit<WarehouseReceipt, "receiptId"> = {
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
                    status: "INITIATED",
                    entityId: entityId,
                    noteThreadId: noteThreadId,
                    toEmails: detail.toEmails,
                    accountOnHold: 'N',
                    sendToTellSystem: 'N',
                    hasFlatRate: 'N',
                    location: "",
                    receivedBy: ""
                };

                const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, receipt);

                receiptIds.push(receiptId);
                console.log("Receipt ID:", receiptId);

                // Step 8: Emit audit log event (centralized handling)
                emitAuditLog({
                    receiptNumber,
                    receiptId,
                    proNumber: detail.proNumber,
                    userId: userId,
                    status: "INITIATED",
                    description: `Receipt created for verification ID ${verificationId}`,
                    level: "INFO"
                });
                console.log(`📝 Audit log queued for receipt #${receiptNumber}`);

                // Step 9: Emit email notifications to multiple recipients (if configured)
                if (detail.toEmails && detail.toEmails.length > 0) {
                    for (const emailRecipient of detail.toEmails) {
                        // emitEmail will queue email notification asynchronously
                        emitEmail({
                            receiptNumber,
                            to: emailRecipient,
                            status: "INITIATED"
                        });
                    }
                    console.log(`📧 Email notifications queued for receipt #${receiptNumber} to ${detail.toEmails.length} recipient(s)`);
                } else {
                    console.warn(`⚠️ No email recipients configured for receipt #${receiptNumber}`);
                }
            }
        }

        const receipts = await Promise.all(receiptIds.map(async (receiptId) => {
            const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
            return {
                receiptId: receipt?.receiptId,
                receiptNumber: receipt?.receiptNumber,
                proNumber: receipt?.proNumber,
                status: receipt?.status,
                customerName: receipt?.customerName,
                stationName: receipt?.stationName,
                carrierName: receipt?.carrierName
            };
        }));

        await conn.commit();
        return { verificationIds, receipts };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

/**
 * LIST VERIFICATIONS WITH DETAILED INFO
 * @param filterLogic - "AND" (all filters must match) or "OR" (any filter matches). Default: "AND"
 */
export async function listVerificationService(
    conn: Connection,
    page: number = 1,
    pageSize: number = 10,
    filters?: {
        verificationId?: string;
        carrierName?: string;
        customerName?: string;
        stationName?: string;
        driverName?: string;
        verifyedByEmployee?: string;
        startDate?: Date;
        endDate?: Date;
    },
    filterLogic: "AND" | "OR" = "AND"
) {
    const offset = (page - 1) * pageSize;

    // Get total count
    const total = await idVerificationDB.countIDVerifications(conn, filters, filterLogic);

    // Get verifications with filters
    const verifications = await idVerificationDB.listIDVerificationsWithFilters(
        conn,
        pageSize,
        offset,
        filters,
        filterLogic
    );

    // Enrich each verification with driver info, pro details, user name, and related receipt summaries
    const detailedVerifications = await Promise.all(
        verifications.map(async (verification: any) => {
            const driver = await idVerificationDB.getDriverById(conn, verification.driverId);
            const proDetails = await idVerificationDB.getProDetailsByVerification(conn, verification.verificationId);
            const createdByName = await userDB.getUserName(conn, verification.createdBy);
            const receipts = (await warehouseReceiptDB.getWarehouseReceiptsByVerification(conn, verification.verificationId))
                .map((receipt: any) => ({
                    receiptId: receipt.receiptId,
                    receiptNumber: receipt.receiptNumber,
                    proNumber: receipt.proNumber,
                    status: receipt.status,
                    customerName: receipt.customerName,
                    stationName: receipt.stationName,
                    carrierName: receipt.carrierName
                }));

            return {
                ...verification,
                createdAt: verification.createdAt ? toUtcDate(verification.createdAt) : null,
                createdByName,
                driver,
                proDetails,
                receipts
            };
        })
    );

    return {
        data: detailedVerifications,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
    };
}

/**
 * GET VERIFICATION WITH DRIVER + PRO DETAILS + RECEIPTS
 */
export async function getVerificationService(conn: Connection, id: number) {
    const verification = await idVerificationDB.getIDVerificationById(conn, id);
    if (!verification) return null;

    const driver = await idVerificationDB.getDriverById(conn, verification.driverId);
    const proDetails = await idVerificationDB.getProDetailsByVerification(conn, id);
    const receipts = (await warehouseReceiptDB.getWarehouseReceiptsByVerification(conn, id)).map((receipt: any) => ({
        receiptId: receipt.receiptId,
        receiptNumber: receipt.receiptNumber,
        proNumber: receipt.proNumber,
        status: receipt.status,
        customerName: receipt.customerName,
        stationName: receipt.stationName,
        carrierName: receipt.carrierName
    }));

    return {
        ...verification,
        createdAt: verification.createdAt ? toUtcDate(verification.createdAt) : null,
        createdByName: await userDB.getUserName(conn, verification.createdBy),
        driver,
        proDetails,
        receipts
    };
}
