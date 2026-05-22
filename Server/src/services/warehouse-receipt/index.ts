import { Connection } from "odbc";
import fs from "fs";
import path from "path";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import * as idVerificationDB from "../../database/id-verification";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as customerDB from "../../database/maintanance/customer";
import * as carrierDB from "../../database/maintanance/carrier";
import { emitAuditLog } from "../../utils/email";
import { WarehouseReceipt, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptTemp } from "../../entities/warehouse-receipt";
import { getProDetailFromCsv, validateProCsvData, findProCsvFile } from "../../utils/pro-csv-handler";

/**
 * GET WAREHOUSE RECEIPT WITH ALL DETAILS
 * - Fetches receipt, freight info with images, rates, and audit logs
 */
export async function getWarehouseReceiptWithDetailsService(conn: Connection, receiptId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptByReceiptNumber(conn, receiptId);
    if (!receipt) return null;

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

    // Fetch images for each freight
    const freightWithImages = await Promise.all(
        freightInfos.map(async (freight) => ({
            ...freight,
            images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
        }))
    );

    const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId);
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receiptId);

    return {
        ...receipt,
        freightInfos: freightWithImages,
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
            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);

            const freightWithImages = await Promise.all(
                freightInfos.map(async (freight) => ({
                    ...freight,
                    images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                }))
            );

            const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receipt.receiptId);
            const auditLogs = await warehouseReceiptDB.getAuditLogsByReceipt(conn, receipt.receiptId);

            return {
                ...receipt,
                freightInfos: freightWithImages,
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
    const data = await warehouseReceiptDB.listWarehouseReceipts(conn, pageSize, offset, filters);
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

    const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
    const totalPieces = freightInfos.reduce((sum, f) => sum + f.pieces, 0);
    const totalWeight = freightInfos.reduce((sum, f) => sum + (f.weight || 0), 0);

    // Count total images across all freight items
    let totalImages = 0;
    for (const freight of freightInfos) {
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
        freightCount: freightInfos.length,
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
        const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

        // Fetch images for each freight
        const freightWithImages = await Promise.all(
            freightInfos.map(async (freight) => ({
                ...freight,
                images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
            }))
        );

        return {
            ...receipt,
            freightInfos: freightWithImages
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

        // Process each receipt in the array
        for (const item of receipts) {
            let { receipt, freightDetails } = item;

            if (!receipt || !Array.isArray(freightDetails)) {
                throw new Error("Each item must have receipt object and freightDetails array");
            }

            // Auto-create ID verification if verificationId not provided
            if (!receipt.verificationId || receipt.verificationId === 0 || receipt.verificationId === null || receipt.verificationId === undefined) {

                if (!receipt.driverName) {
                    throw new Error("Driver name is required to create ID verification");
                }

                console.log(`Creating new ID verification for driver: ${receipt.driverName}`);

                // Create driver with just driver name (no signature)
                const driverId = await idVerificationDB.createDriver(conn, {
                    driverName: receipt.driverName,
                    driverSignature: null
                });

                // Create ID verification
                const verificationId = await idVerificationDB.createIDVerification(conn, {
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

                console.log(`Created ID verification ID ${verificationId} for driver: ${receipt.driverName}`);
                receipt.verificationId = verificationId;
            }

            // Check if this is an update (receipt has receiptId) or create (doesn't have receiptId)
            if (receipt.receiptId) {
                // UPDATE operation
                const receiptId = receipt.receiptId;

                // Get all existing receipt data
                const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                if (!existingReceipt) {
                    throw new Error(`Receipt with ID ${receiptId} not found`);
                }

                // System fields that should NOT be updated
                const systemFields = ['receiptId', 'receiptNumber', 'createdAt', 'createdBy', 'documentId', 'entityId', 'noteThreadId', 'receiptDate'];

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


                console.log(`Updated receipt ID ${receiptId} with data:`, receipt.badFreightImages);

                if (Array.isArray(receipt.badFreightImages)) {
                    console.log(`Creating freight images for freight ID ${receiptId}:`, receipt.badFreightImages);
                    for (const imagePath of receipt.badFreightImages) {
                        await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, imagePath);
                    }
                }

                console.log(`Updated receipt ID ${receiptId} with data:`, updateData);

                // Delete existing freight details and create new ones
                await warehouseReceiptDB.deleteFreightInfoByReceipt(conn, receiptId);

                console.log(`Deleted existing freight info for receipt ID ${receiptId}`);

                // Create new freight details with images
                for (const freight of freightDetails) {
                    console.log("Freight", freight);

                    const { images, ...freightData } = freight;

                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId
                    });

                    console.log(`Created freight info ID ${freightId} for receipt ID ${receiptId} with data:`, freightData);

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        console.log(`Creating freight images for freight ID ${freightId}:`, images);
                        for (const imagePath of images) {
                            await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                        }
                    }

                    console.log(`Completed freight info ID ${freightId} for receipt ID ${receiptId}`);
                }

                // Get updated receipt with all details
                const updatedReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);

                const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId);

                const updatedReceiptWithBadFreightConditionImages = {
                    ...updatedReceipt,
                    badFreightConditionImages
                };

                const updatedFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const updatedFreightWithImages = await Promise.all(
                    updatedFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                updatedReceipts.push({
                    ...updatedReceiptWithBadFreightConditionImages,
                    freightInfos: updatedFreightWithImages
                });
            } else {

                console.log("Creating new receipt with data:", receipt);
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
                    console.log(`Creating freight images for freight ID ${receiptId}:`, dataWithUser.badFreightImages);
                    for (const imagePath of dataWithUser.badFreightImages) {
                        await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, imagePath);
                    }
                }


                console.log(`Created new receipt ID ${receiptId} with data:`, dataWithUser);

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

                const createdReceiptWithBadFreightConditionImages = {
                    ...createdReceipt,
                    badFreightConditionImages
                };

                const createdFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                // Fetch images for each freight
                const createdFreightWithImages = await Promise.all(
                    createdFreightInfos.map(async (freight) => ({
                        ...freight,
                        images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
                    }))
                );

                createdReceipts.push({
                    ...createdReceiptWithBadFreightConditionImages,
                    freightInfos: createdFreightWithImages
                });
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

            console.log(`PRO detail retrieved from CSV for PRO ${proNumber}:`, csvData);

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
