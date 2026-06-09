import { Connection } from "odbc";
import fs from "fs";
import path from "path";
import { Socket } from "net";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import * as idVerificationDB from "../../database/id-verification";
import { dataToZPL } from "../../utils/labelPrintHandler";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as customerDB from "../../database/maintanance/customer";
import * as carrierDB from "../../database/maintanance/carrier";
import { emitAuditLog, emitEmail } from "../../utils/email";
import { WarehouseReceipt, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptTemp } from "../../entities/warehouse-receipt";
import { getProDetailFromCsv, validateProCsvData, findProCsvFile } from "../../utils/pro-csv-handler";
import { createWarehouseReceiptPDF } from "../../utils/warehouseReceiptPDFHandler";
import { ensureUploadDirExists } from "../../config/multer";


export async function getWarehouseReceiptWithDetailsService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptByReceiptNumber(conn, receiptId);
    if (!receipt) return null;

    const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

    // Fetch images for each freight
    const freightWithImages = await Promise.all(
        freightInformation.map(async (freight) => ({
            ...freight,
            images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
        }))
    );

    const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId);
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receiptId);

    return {
        ...receipt,
        freightInformation: freightWithImages,
        rate,
        auditLogs
    };
}

/**
 * GET WAREHOUSE RECEIPT BY PRO NUMBER WITH ALL DETAILS
 * - Fetches receipt by PRO number, including freight info with images, rates, and audit logs
 */
export async function getWarehouseReceiptsByProService(conn: Connection, proNumber: string) {
    const receipts = await warehouseReceiptDB.getWarehouseReceiptsByProNumber(conn, proNumber);
    if (!receipts || receipts.length === 0) return [];

    return Promise.all(
        receipts.map(async (receipt) => {
            const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);

            const freightWithImages = await Promise.all(
                freightInformation.map(async (freight) => ({
                    ...freight,
                    images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                }))
            );

            const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receipt.receiptId);
            const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receipt.receiptId);

            return {
                ...receipt,
                freightInformation: freightWithImages,
                rate,
                auditLogs
            };
        })
    );
}


/**
 * LIST WAREHOUSE RECEIPTS WITH PAGINATION & FILTERING
 */
export async function listWarehouseReceiptsService(
    conn: Connection,
    page: number = 1,
    pageSize: number = 10,
    filters?: { status?: string; carrierId?: number }
) {
    const offset = (page - 1) * pageSize;
    let data = [];
    data = await warehouseReceiptDB.listWarehouseReceipts(conn, pageSize, offset, filters);

    data = await Promise.all(
        data.map(async (receipt) => {
            const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receipt.receiptId);
            return { ...receipt, badFreightConditionImages };
        })
    );

    data = await Promise.all(
        data.map(async (receipt) => {
            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
            const freightWithImages = await Promise.all(
                freightInfos.map(async (freight) => ({
                    ...freight,
                    images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                }))
            );
            return { ...receipt, freightInformation: freightWithImages };
        })
    );
    const DIM_FACTOR = 166;

    data = await Promise.all(
        data.map(async (receipt) => {
            const rate = await customerDB.getStationRateDetails(conn, receipt.stationId);

            if (rate && rate.length > 0) {
                let totalActualWeight = 0;
                let totalDimensionalWeight = 0;

                if (receipt.freightInformation && Array.isArray(receipt.freightInformation)) {
                    receipt.freightInformation.forEach((freight) => {
                        const {
                            pieces = 0,
                            length = 0,
                            width = 0,
                            height = 0,
                            weight = 0,
                        } = freight;

                        // ✅ Sum actual weight
                        totalActualWeight += weight;

                        // ✅ Sum dimensional weight
                        const dimWeight = (pieces * length * width * height) / DIM_FACTOR;
                        totalDimensionalWeight += dimWeight;
                    });
                }

                // ✅ Compare totals
                const chargeableWeight = Math.max(totalActualWeight, totalDimensionalWeight);

                const rateInformation = {
                    minRate: rate[0].minRate,
                    maxRate: rate[0].maxRate,
                    ratePerPound: rate[0].ratePerPound,
                    finalRate: chargeableWeight * rate[0].ratePerPound,
                    rateCalculatedBy: totalActualWeight >= totalDimensionalWeight ? "ACTUAL_WEIGHT" : "DIMENSIONAL_WEIGHT",
                };

                // ✅ Optional min/max enforcement
                if (
                    rateInformation.minRate &&
                    rateInformation.finalRate < rateInformation.minRate
                ) {
                    rateInformation.finalRate = rateInformation.minRate;
                }

                if (
                    rateInformation.maxRate &&
                    rateInformation.finalRate > rateInformation.maxRate
                ) {
                    rateInformation.finalRate = rateInformation.maxRate;
                }

                return { ...receipt, rateInformation };

            } else {
                return { ...receipt, rateInformation: null };
            }
        })
    );

    return { data, page, pageSize };
}

/**
 * GET RECEIPTS BY VERIFICATION ID
 */
export async function getReceiptsByVerificationService(conn: Connection, verificationId: number) {
    return await warehouseReceiptDB.getWarehouseReceiptsByVerification(conn, verificationId);
}

/**
 * GET RECEIPTS BY CUSTOMER & STATION
 */
export async function getReceiptsByCustomerStationService(conn: Connection, customerId: number, stationId: number) {
    return await warehouseReceiptDB.getWarehouseReceiptsByCustomerStation(conn, customerId, stationId);
}

/**
 * UPDATE WAREHOUSE RECEIPT
 * - If status is updated, automatically create an audit log for the status change
 */
export async function updateWarehouseReceiptService(
    conn: Connection,
    receiptId: number,
    updates: Partial<Omit<WarehouseReceipt, 'receiptId' | 'createdAt' | 'createdBy'>>
) {
    // Get current receipt before update
    const currentReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!currentReceipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    // Update receipt
    await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, updates);

    // If status changed, emit audit log automatically (centralized handling)
    if (updates.status && updates.status !== currentReceipt.status) {
        emitAuditLog({
            receiptNumber: currentReceipt.receiptNumber,
            receiptId,
            proNumber: currentReceipt.proNumber || undefined,
            userId: updates.updatedBy || currentReceipt.createdBy,
            status: updates.status,
            description: `Status changed from ${currentReceipt.status} to ${updates.status}`,
            level: "INFO"
        });
    }

    return await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
}

/**
 * ADD FREIGHT INFO TO RECEIPT
 */
export async function addFreightInfoService(conn: Connection, freightData: Omit<FreightInfo, "freightId">) {
    const freightId = await warehouseReceiptDB.createFreightInfo(conn, freightData);

    // Handle images if provided
    const images = (freightData as any).images || [];
    if (Array.isArray(images)) {
        for (const imagePath of images) {
            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
        }
    }

    return { freightId };
}

/**
 * UPDATE FREIGHT INFO
 */
export async function updateFreightInfoService(conn: Connection, freightId: number, updates: any) {
    const { images, ...updateData } = updates;

    // Update freight info
    await warehouseReceiptDB.updateFreightInfo(conn, freightId, updateData);

    // Handle images if provided
    if (Array.isArray(images)) {
        // Delete existing images
        await warehouseReceiptDB.deleteFreightImagesByFreight(conn, freightId);

        // Create new images
        for (const imagePath of images) {
            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
        }
    }
}

/**
 * GET FREIGHT INFO WITH IMAGES
 */
export async function getFreightInfoWithImagesService(conn: Connection, freightId: number) {
    const freight = await warehouseReceiptDB.getFreightInfoById(conn, freightId);
    if (!freight) return null;

    const images = await warehouseReceiptDB.getFreightImages(conn, freightId);
    return {
        ...freight,
        images
    };
}

/**
 * ADD AUDIT LOG
 * Emits audit log event for asynchronous centralized processing
 */
export async function addAuditLogService(conn: Connection, logData: Omit<AuditLog, "auditLogId" | "eventTime">) {
    emitAuditLog({
        receiptNumber: logData.receiptNumber,
        receiptId: logData.receiptId,
        proNumber: logData.proNumber,
        userId: logData.userId,
        status: logData.status,
        description: logData.description,
        level: logData.level
    });
    return { message: 'Audit log queued for processing' };
}

/**
 * ADD RATE TO RECEIPT
 */
export async function addWarehouseReceiptRateService(conn: Connection, rateData: Omit<WarehouseReceiptRate, "rateId">) {
    const rateId = await warehouseReceiptDB.createWarehouseReceiptRate(conn, rateData);
    return { rateId };
}

/**
 * UPDATE RECEIPT RATE
 */
export async function updateWarehouseReceiptRateService(conn: Connection, rateId: number, updates: any) {
    await warehouseReceiptDB.updateWarehouseReceiptRate(conn, rateId, updates);
}

/**
 * GET RECEIPT SUMMARY (STATUS, COUNTS, TOTALS)
 */
export async function getReceiptSummaryService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!receipt) return null;

    const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
    const totalPieces = freightInformation.reduce((sum, f) => sum + f.pieces, 0);
    const totalWeight = freightInformation.reduce((sum, f) => sum + (f.weight || 0), 0);

    // Count total images across all freight items
    let totalImages = 0;
    for (const freight of freightInformation) {
        const images = await warehouseReceiptDB.getFreightImages(conn, freight.freightId);
        totalImages += images.length;
    }

    return {
        receiptNumber: receipt.receiptNumber,
        proNumber: receipt.proNumber,
        status: receipt.status,
        customerId: receipt.customerId,
        stationId: receipt.stationId,
        carrierId: receipt.carrierId,
        totalPieces,
        totalWeight,
        freightCount: freightInformation.length,
        totalImages,
        createdAt: receipt.createdAt,
        createdBy: receipt.createdBy
    };
}

/**
 * CREATE TEMPORARY WAREHOUSE RECEIPT
 * - Creates temp receipt and returns all data
 */
/**
 * CREATE TEMPORARY WAREHOUSE RECEIPT
 * - Creates temp receipt and returns all data
 * - createdBy comes from authenticated user
 */
export async function createTemporaryWarehouseReceiptService(conn: Connection, tempData: Omit<WarehouseReceiptTemp, "receiptNumber">, userId: number) {
    const dataWithUser = {
        ...tempData,
        receiptDate: new Date(),
        createdBy: userId
    };
    const receiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn, dataWithUser);
    const tempReceipt = await warehouseReceiptDB.getWarehouseReceiptTempByNumber(conn, receiptNumber);
    return tempReceipt;
}

/**
 * CREATE WAREHOUSE RECEIPT WITH FREIGHT INFO
 * - Creates receipt, adds all freight info, and returns receipt with freight details
 * - createdBy comes from authenticated user
 */
export async function createWarehouseReceiptWithFreightService(
    conn: Connection,
    receiptData: any,
    freightDetails: any[],
    userId: number
) {
    await conn.beginTransaction();
    try {
        // Add createdBy from authenticated user
        const dataWithUser = {
            ...receiptData,
            createdBy: userId
        };

        // Create warehouse receipt
        const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, dataWithUser);

        // Create document
        const documentId = await warehouseReceiptDB.createWarehouseReceiptDocument(conn, receiptId);

        // Update receipt with documentId
        await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, { documentId });

        // Create freight info records
        const freightIds: number[] = [];
        for (const freight of freightDetails) {
            const { images, ...freightData } = freight;

            const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                ...freightData,
                receiptId
            });
            freightIds.push(freightId);

            // Create associated images if provided
            if (Array.isArray(images)) {
                for (const imagePath of images) {
                    await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                }
            }
        }

        await conn.commit();

        // Get complete receipt with all details
        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

        // Fetch images for each freight
        const freightWithImages = await Promise.all(
            freightInformation.map(async (freight) => ({
                ...freight,
                images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
            }))
        );

        return {
            ...receipt,
            freightInformation: freightWithImages
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

/**
 * BATCH PROCESS WAREHOUSE RECEIPTS
 * - Auto-creates ID verification if verificationId not provided
 * - Uses driver name from receipt payload
 * - Uses PRO number from header receipt
 * - Updates reference receipt with provided updates
 * - Creates multiple new warehouse receipts with freight info
 * - Returns updated reference receipt and all newly created receipts
 */
export async function batchProcessWarehouseReceiptsService(
    conn: Connection,
    receipts: any[],
    userId: number
) {
    await conn.beginTransaction();
    try {
        const updatedReceipts = [];
        const createdReceipts = [];
        let verificationId = 0;

        // Process each receipt in the array
        for (const item of receipts) {
            let { receipt, freightDetails } = item;

            if (!receipt || !Array.isArray(freightDetails)) {
                throw new Error("Each item must have receipt object and freightDetails array");
            }

            // Auto-create ID verification if verificationId not provided
            if (!receipt.verificationId || receipt.verificationId === 0 || receipt.verificationId === null || receipt.verificationId === undefined) {

                if (verificationId === 0 || verificationId === null || verificationId === undefined) {
                    if (!receipt.driverName) {
                        throw new Error("Driver name is required to create ID verification");
                    }

                    // Create driver with just driver name (no signature)
                    const driverId = await idVerificationDB.createDriver(conn, {
                        driverName: receipt.driverName,
                        driverSignature: null
                    });

                    // Create ID verification
                    verificationId = await idVerificationDB.createIDVerification(conn, {
                        carrierId: receipt.carrierId,
                        customerId: receipt.customerId,
                        stationId: receipt.stationId,
                        driverId: driverId,
                        doorNo: receipt.doorNo || "0",
                        firstIdType: receipt.firstIdType || "UNKNOWN",
                        secondIdType: receipt.secondIdType || "NA",
                        firstIdPhotoMatch: receipt.firstIdPhotoMatch ? 'Y' : 'N',
                        secondIdPhotoMatch: receipt.secondIdPhotoMatch ? 'Y' : 'N',
                        shipperCompanyName: receipt.shipperCompanyName || "Listed Above",
                        verifiedByEmployee: "System Auto-Verification",
                        createdBy: userId
                    });

                    const proDetailId = await idVerificationDB.createProDetail(conn, {
                        verificationId,
                        pieces: receipt.piecesInland,
                        weight: receipt.weightInland,
                        shipper: receipt.shipper,
                        proNumber: receipt.proNumber,
                    });

                    receipt.verificationId = verificationId;
                }
                else {
                    receipt.verificationId = verificationId;
                }
            }

            receipt.status = "ON_HAND";

            // Check if this is an update (receipt has receiptId) or create (doesn't have receiptId)
            if (receipt.receiptId && receipt.receiptId !== 0) {
                // UPDATE operation
                const receiptId = receipt.receiptId;

                // Get all existing receipt data
                const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                if (!existingReceipt) {
                    throw new Error(`Receipt with ID ${receiptId} not found`);
                }

                // System fields that should NOT be updated
                const systemFields = ['receiptId', 'receiptNumber', 'createdAt', 'createdBy', 'entityId', 'noteThreadId', 'receiptDate'];

                // Extract only updateable fields from provided receipt
                const updateData: any = {};
                Object.keys(receipt).forEach(key => {
                    if (!systemFields.includes(key)) {
                        updateData[key] = receipt[key];
                    }
                });

                // Set updatedBy to current user
                updateData.updatedBy = userId;

                // Update the receipt with filtered data
                await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, updateData);


                if (Array.isArray(receipt.badFreightImages)) {

                    for (const imagePath of receipt.badFreightImages) {
                        await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, imagePath);
                    }
                }

                // Delete existing freight details and create new ones
                await warehouseReceiptDB.deleteFreightInfoByReceipt(conn, receiptId);

                // Create new freight details with images
                for (const freight of freightDetails) {
                    const { images, ...freightData } = freight;

                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId
                    });

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        for (const imagePath of images) {
                            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                        }
                    }

                }

                // Get updated receipt with all details
                const updatedReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId);
                const updatedFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const updatedFreightWithImages = await Promise.all(
                    updatedFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                const updatedReceiptData = {
                    ...updatedReceipt,
                    badFreightConditionImages,
                    freightInformation: updatedFreightWithImages
                }

                updatedReceipts.push(updatedReceiptData);



                //Generate PDF for updated receipt
                //While calling the procedure you should pass the path with the file name where you want to save the generated PDF. For example: /home/warehouse-app-docs/temp-receipt-output/receipt-123.pdf
                //If it is the multiple file send you should separate the file path with the ";" For example: /home/warehouse-app-docs/temp-receipt-output/receipt-123.pdf;/home/warehouse-app-docs/temp-receipt-output/receipt-124.pdf
                const tempReceiptOutPath = ensureUploadDirExists(process.env.TEMP_RECEIPT_OUTPUT);
                await createWarehouseReceiptPDF(updatedReceiptData, false, tempReceiptOutPath);

                emitAuditLog({
                    receiptNumber: updatedReceiptData.receiptNumber ? updatedReceiptData.receiptNumber : 0,
                    receiptId,
                    proNumber: updatedReceiptData.proNumber,
                    userId: userId,
                    status: updatedReceiptData.status ? updatedReceiptData.status : "ON_HAND",
                    description: `Receipt now ON-HAND for verification ID ${updatedReceiptData.verificationId}`,
                    level: "INFO"
                });

                if (updatedReceiptData.toEmails && Array.isArray(updatedReceiptData.toEmails) && updatedReceiptData.toEmails.length > 0) {

                    for (const emailRecipient of updatedReceiptData.toEmails) {
                        // emitEmail will queue email notification asynchronously
                        emitEmail({
                            receiptNumber: updatedReceiptData.receiptNumber ? updatedReceiptData.receiptNumber : 0,
                            to: emailRecipient,
                            status: updateData.status,
                            hasAttachment: true,
                            attachmentPath: tempReceiptOutPath + `/${updatedReceiptData.receiptNumber}.pdf`
                        });
                    }
                }

            } else {

                const entityId = await entityDB.createWarehouseEntity(conn, 'WAREHOUSE_RECEIPT', receipt.receiptNumber.toString());
                const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

                // Add createdBy from authenticated user
                const dataWithUser = {
                    ...receipt,
                    receiptDate: new Date(),
                    createdBy: userId,
                    entityId,
                    noteThreadId
                };

                // Create warehouse receipt
                const receiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, dataWithUser);

                if (Array.isArray(dataWithUser.badFreightImages)) {
                    for (const imagePath of dataWithUser.badFreightImages) {
                        await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, imagePath);
                    }
                }

                // Create freight info records with images
                for (const freight of freightDetails) {
                    const { images, ...freightData } = freight;
                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId
                    });

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        for (const imagePath of images) {
                            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                        }
                    }
                }

                // Get complete receipt with all details
                const createdReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId);
                const createdFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const createdFreightWithImages = await Promise.all(
                    createdFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                const createdReceiptData = {
                    ...createdReceipt,
                    badFreightConditionImages,
                    freightInformation: createdFreightWithImages
                }

                createdReceipts.push(createdReceiptData);

                const tempReceiptOutPath = ensureUploadDirExists(process.env.TEMP_RECEIPT_OUTPUT);
                await createWarehouseReceiptPDF(createdReceiptData, false, tempReceiptOutPath);



                emitAuditLog({
                    receiptNumber: createdReceiptData.receiptNumber ? createdReceiptData.receiptNumber : 0,
                    receiptId,
                    proNumber: createdReceiptData.proNumber,
                    userId: userId,
                    status: createdReceiptData.status ? createdReceiptData.status : "ON_HAND",
                    description: `Receipt now ON-HAND for verification ID ${createdReceiptData.verificationId}`,
                    level: "INFO"
                });

                if (createdReceiptData.toEmails && Array.isArray(createdReceiptData.toEmails) && createdReceiptData.toEmails.length > 0) {
                    for (const emailRecipient of dataWithUser.toEmails) {
                        // emitEmail will queue email notification asynchronously
                        emitEmail({
                            receiptNumber: dataWithUser.receiptNumber,
                            to: emailRecipient,
                            status: dataWithUser.status,
                            hasAttachment: true,
                            attachmentPath: tempReceiptOutPath + `/${createdReceiptData.receiptNumber}.pdf`
                        });
                    }
                }
            }
        }

        await conn.commit();

        // Collect all receipt numbers from updated and created receipts
        const receiptNumbers = [
            ...updatedReceipts.map(r => r.receiptNumber).filter(Boolean),
            ...createdReceipts.map(r => r.receiptNumber).filter(Boolean)
        ];

        return {
            updated: updatedReceipts,
            created: createdReceipts,
            totalUpdated: updatedReceipts.length,
            totalCreated: createdReceipts.length,
            receiptNumbers
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

export async function rejectWarehouseReceiptService(conn: Connection, receiptId: number, reason: string, userId: number) {
    await conn.beginTransaction();
    try {
        // Update receipt status to REJECTED and add rejection reason
        await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, {
            status: 'REJECTED',
            rejectionReason: reason,
            updatedBy: userId
        });

        // emitAuditLog({
        //     receiptNumber,
        //     receiptId,
        //     proNumber: detail.proNumber,
        //     userId: userId,
        //     status: "INITIATE",
        //     description: `Receipt created for verification ID ${verificationId}`,
        //     level: "INFO"
        // });
        // console.log(`📝 Audit log queued for receipt #${receiptNumber}`);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}

/**
 * GET PRO HEADER DETAILS SERVICE
 * Retrieves detailed PRO information for a given PRO number
 * Flow:
 * 1. Check database first (Warehouse_RM_Pro_Detail)
 * 2. If not found, read from CSV file in FTP folder
 * 3. Validate data and save to database for future use
 * 4. Check for duplicate warehouse receipts
 * 5. Validate customer/station and carrier
 * 6. Delete CSV file after successful processing
 * 7. Return formatted response with all relevant fields
 */
export async function getProHeaderDetailsService(conn: Connection, proNumber: string, userId: number) {
    let proDetail = await warehouseReceiptDB.getProHeaderDetailsByProNumber(conn, proNumber);
    let csvFilePath: string | null = null;

    // If not in database, try to read from CSV file
    if (!proDetail) {
        try {
            const csvData = await getProDetailFromCsv(proNumber);

            if (!csvData) {
                throw new Error(`No PRO detail found for PRO number: ${proNumber} (not in database or CSV file)`);
            }

            // Validate CSV data
            const validation = validateProCsvData(csvData);
            if (!validation.valid) {
                throw new Error(`Invalid PRO data in CSV: ${validation.errors.join(', ')}`);
            }

            // Save CSV data to database for future use
            await warehouseReceiptDB.saveProDetail(conn, {
                proNumber: csvData.proNumber,
                driverNumber: csvData.driverNumber,
                shipperAccountNumber: csvData.shipperAccountNumber,
                shipperName: csvData.shipperName,
                customrAccountNumber: csvData.fwdrAccountNumber,
                customerName: csvData.fwdrName,
                carrierName: csvData.carrierName,
                pieces: csvData.pieces,
                weight: csvData.weight,
                proDate: csvData.proDate,
                customerReferenceNumber: csvData.fwdrRef,
                city: csvData.destCity,
                hazmat: csvData.hazmat
            });

            // Get CSV file path for deletion later
            csvFilePath = await findProCsvFile(proNumber);

            // Fetch saved data to get proDetailId
            proDetail = await warehouseReceiptDB.getProHeaderDetailsByProNumber(conn, proNumber);
        } catch (error: any) {
            throw new Error(`Failed to retrieve PRO details: ${error.message}`);
        }
    }

    if (!proDetail) {
        throw new Error(`Failed to retrieve or save PRO detail for PRO number: ${proNumber}`);
    }

    // Check for duplicate warehouse receipts (prevent reuse if already used)
    const duplicateReceipt = await warehouseReceiptDB.checkDuplicateProByCarrierName(
        conn,
        proDetail.carrierName,
        proNumber
    );
    if (duplicateReceipt) {
        throw new Error(`Duplicate - Carrier "${proDetail.carrierName}" with PRO "${proNumber}" already added in another Record`);
    }

    // Validate customer/station exists
    const station = await customerDB.getStationByRmAccountNumber(conn, proDetail.customrAccountNumber);
    if (!station) {
        throw new Error(`Customer not found with customer name: ${proDetail.customerName}`);
    }

    // Validate carrier exists
    const carrier = await carrierDB.getCarrierByName(conn, proDetail.carrierName);
    if (!carrier) {
        throw new Error(`Carrier not found: ${proDetail.carrierName}`);
    }

    const receiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn,
        {
            verificationId: 0,
            receiptDate: new Date(),
            shipper: proDetail.shipperName,
            customerId: station.customerId,
            stationId: station.stationId,
            carrierId: carrier.carrierId,
            createdBy: userId,
            status: 'INITIATED',
            proNumber: proDetail.proNumber,
            packageId: null,
            receivedBy: null,
            location: null
        }
    )

    // Delete CSV file after successful processing
    if (csvFilePath && fs.existsSync(csvFilePath)) {
        try {
            await fs.promises.unlink(csvFilePath);
            console.log(`CSV file deleted successfully: ${csvFilePath}`);
        } catch (error: any) {
            console.error(`Failed to delete CSV file: ${csvFilePath}`, error.message);
            // Don't throw error, just log it
        }
    }

    // Format response with required fields and enriched customer/carrier data
    return {
        proDetailId: proDetail.proDetailId,
        driver: proDetail.driverNumber,
        shipper: proDetail.shipperName,
        shipperAccountNumber: proDetail.shipperAccountNumber,
        customerId: station.customerId,
        customerName: station.customerName,
        stationId: station.stationId,
        stationName: station.stationName,
        consigneeAccountNumber: proDetail.customrAccountNumber,
        customerReferenceNumber: proDetail.customerReferenceNumber,
        carrierId: carrier.carrierId,
        carrier: carrier.carrierName,
        city: proDetail.city || '',
        weight: proDetail.weight,
        pieces: proDetail.pieces,
        proNumber: proDetail.proNumber,
        proDate: proDetail.proDate,
        hazmat: proDetail.hazmat || 'N',
        receiptNumber: receiptNumber
    };
}



/**
 * GET WAREHOUSE RECEIPT WITH ALL DETAILS
 * - Fetches receipt, freight info with images, rates, and audit logs
 */
function sendZplToPrinter(zpl: string, printerIp: string, printerPort: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = new Socket();
        client.connect(printerPort, printerIp, () => {
            client.write(zpl, (err) => {
                if (err) {
                    client.destroy();
                    reject(err);
                    return;
                }
                client.end();
                resolve();
            });
        });

        client.on("error", (err) => {
            client.destroy();
            reject(err);
        });

        client.on("timeout", () => {
            client.destroy();
            reject(new Error("Printer connection timed out"));
        });
    });
}

type LabelReceiptData = WarehouseReceipt & {
    customerName?: string;
    carrierName?: string;
};

export async function printWarehouseReceiptLabelService(
    conn: Connection,
    payload: {
        printerPort?: number | string;
        printerIP?: string;
        labelCount?: number;
        receiptNumber?: number;
        customerName?: string;
        packageId?: string;
        shipper?: string;
        carrierName?: string;
        proNumber?: string;
        destination?: string;
        pieces?: number;
    }
) {
    const printerPort = payload.printerPort ? Number(payload.printerPort) : undefined;
    const printerIP = payload.printerIP;

    if (!printerPort || !printerIP || !payload.receiptNumber) {
        throw new Error("printerPort, printerIP, and receiptNumber are required");
    }

    let printData;

    // If full payload is provided, use it directly
    if (payload.customerName && payload.shipper && payload.carrierName) {
        printData = {
            labelCount: payload.labelCount && payload.labelCount > 0 ? payload.labelCount : 1,
            receiptNumber: payload.receiptNumber,
            customerName: payload.customerName,
            packageId: payload.packageId || "",
            shipper: payload.shipper,
            carrierName: payload.carrierName,
            proNumber: payload.proNumber || "",
            destination: payload.destination || "",
            pieces: payload.pieces || 0
        };
    } else {

        // Otherwise, fetch from DB
        const receipt = await warehouseReceiptDB.getAllWarehouseReceiptByReceiptNumber(conn, payload.receiptNumber) as any | null;
        if (!receipt) {
            throw new Error(`Receipt with number ${payload.receiptNumber} not found`);
        }

        // const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, Number(receipt.receiptId));
        // const pieces = freightInformation.reduce((sum, freight) => sum + (freight.pieces || 0), 0);

        printData = {
            labelCount: payload.labelCount && payload.labelCount > 0 ? payload.labelCount : 1,
            receiptNumber: Number(receipt.receiptNumber),
            customerName: receipt.customerName || "",
            packageId: receipt.packageId || "",
            shipper: receipt.shipper || "",
            carrierName: receipt.carrierName || "",
            proNumber: receipt.proNumber || "",
            destination: receipt.destination || "",
            pieces: receipt.piecesInland || 0
        };
    }

    const zpl = dataToZPL(printData);
    await sendZplToPrinter(zpl, printerIP, printerPort);
    return {
        success: true,
        printedTo: printerIP,
        printerPort,
        printData
    };
}
