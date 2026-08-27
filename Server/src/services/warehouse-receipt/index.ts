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
import * as userDB from "../../database/maintanance/auth";
import { emitAuditLog, emitEmail, sendStatusUpdateEmail } from "../../utils/email";
import { WarehouseReceipt, FreightInfo, AuditLog, WarehouseReceiptRate, WarehouseReceiptTemp } from "../../entities/warehouse-receipt";
import { getProDetailFromCsv, validateProCsvData, findProCsvFile } from "../../utils/pro-csv-handler";
import { createWarehouseReceiptPDF } from "../../utils/warehouseReceiptPDFHandler";
import { ensureUploadDirExists } from "../../config/multer";
import ExcelJS from 'exceljs';


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
    const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, receipt.stationId);
    const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, receipt.stationId);

    return {
        ...receipt,
        freightInformation: freightWithImages,
        rate,
        auditLogs,
        customerEmails: emails,
        stationDefaultEmails: stationDefaultEmails
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
            const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, receipt.stationId);
            const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, receipt.stationId);
            return {
                ...receipt,
                freightInformation: freightWithImages,
                rate,
                auditLogs,
                customerEmails: emails,
                stationDefaultEmails: stationDefaultEmails
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
    status?: string,
    approvalStatus?: string,
    receiptNumber?: string,
    accounting?: boolean,
    filters?: {
        startDate?: string;
        endDate?: string;
        customerId?: number;
        stationId?: number;
        carrierId?: number;
        location?: string;
        proNumber?: string;
        verificationId?: number;
        destination?: string;
        packageId?: string;
        customerRefNumber?: string;
    }
) {
    const offset = (page - 1) * pageSize;
    let data = [];
    const { data: receipts, total } = await warehouseReceiptDB.listWarehouseReceipts(conn, pageSize, offset, status, approvalStatus, receiptNumber, accounting, filters);
    data = receipts;

    data = await Promise.all(
        data.map(async (receipt) => {
            const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receipt.receiptId);
            return { ...receipt, badFreightConditionImages };
        })
    );

    data = await Promise.all(
        data.map(async (receipt) => {
            const documents = await warehouseReceiptDB.getDocumentsByReceiptId(conn, receipt.receiptId);
            return { ...receipt, uploadedDocuments: documents };
        })
    );

    data = await Promise.all(
        data.map(async (receipt) => {
            const emails = receipt
                ? await customerDB.getDepartmentAndPersonnelEmails(conn, receipt.stationId)
                : [];
            const stationDefaultEmails = receipt
                ? await customerDB.getStationDefaultEmails(conn, receipt.stationId)
                : { hasDefaultEmails: 'N', emails: [] };
            return { ...receipt, customerEmails: emails, stationDefaultEmails: stationDefaultEmails };
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
            let rate: {
                minRate: number;
                maxRate: number;
                baseRate: number;
                finalRate?: number;
                department?: string;
                warehouse?: string;
            } | null = null;

            // ✅ Step 1: Try warehouse rate first
            rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receipt.receiptId);

            console.log(`Processing receipt ${receipt.receiptNumber} with warehouse rate:`, rate);

            // ✅ Step 2: If warehouse rate exists and flat rate applies
            if (rate && receipt.hasFlatRate === "Y" && rate.finalRate) {
                let totalActualWeight = 0;
                let totalDimensionalWeight = 0;

                const freightBreakdown: any[] = (receipt.freightInformation || []).map((freight) => {
                    const {
                        pieces = 0,
                        length = 0,
                        width = 0,
                        height = 0,
                        weight = 0,
                        type = "UNKNOWN",
                    } = freight;

                    const actualWeight = pieces * weight;
                    const dimensionalWeight = (pieces * length * width * height) / DIM_FACTOR;

                    totalActualWeight += actualWeight;
                    totalDimensionalWeight += dimensionalWeight;


                    return {
                        pieces,
                        type,
                        length,
                        width,
                        height,
                        actualWeight,
                        dimensionalWeight,
                    };
                });

                return {
                    ...receipt,
                    rateInformation: {
                        minRate: rate.minRate,
                        maxRate: rate.maxRate,
                        baseRate: rate.baseRate,
                        baseRatePerPound: rate.baseRate / 100, // Assuming rate is in cents per pound
                        finalRate: rate.finalRate, // ✅ override with flat rate
                        rateCalculatedBy: "FLAT_RATE",
                        totalActualWeight,
                        totalDimensionalWeight,
                        dimFactor: DIM_FACTOR,
                        freightBreakdown,
                    },
                };
            }

            // ✅ Step 3: If no warehouse rate, check station rate
            if (!rate) {
                rate = await customerDB.getStationRateDetails(conn, receipt.stationId);
            }

            // ✅ Step 4: If we have a rate (station or warehouse without flat rate), calculate
            if (rate) {
                let totalActualWeight = 0;
                let totalDimensionalWeight = 0;

                const freightBreakdown: any[] = (receipt.freightInformation || []).map((freight) => {
                    const {
                        pieces = 0,
                        length = 0,
                        width = 0,
                        height = 0,
                        weight = 0,
                        type = "UNKNOWN",
                    } = freight;

                    const actualWeight = pieces * weight;
                    const dimensionalWeight = (pieces * length * width * height) / DIM_FACTOR;

                    totalActualWeight += actualWeight;
                    totalDimensionalWeight += dimensionalWeight;

                    return {
                        pieces,
                        type,
                        length,
                        width,
                        height,
                        actualWeight,
                        dimensionalWeight,
                    };
                });

                const chargeableWeight = Math.max(totalActualWeight, totalDimensionalWeight);
                const baseRatePerPound = rate.baseRate / 100; // Assuming rate is in cents per pound

                let rateInformation = {
                    minRate: rate.minRate,
                    maxRate: rate.maxRate,
                    baseRate: rate.baseRate,
                    baseRatePerPound,
                    finalRate: chargeableWeight * baseRatePerPound,
                    rateCalculatedBy:
                        totalActualWeight >= totalDimensionalWeight ? "ACTUAL_WEIGHT" : "DIMENSIONAL_WEIGHT",

                    totalActualWeight,
                    totalDimensionalWeight,
                    dimFactor: DIM_FACTOR,
                    freightBreakdown,
                };

                // ✅ Apply min/max constraints
                if (rateInformation.minRate && rateInformation.finalRate < rateInformation.minRate) {
                    rateInformation.finalRate = rateInformation.minRate;
                }

                if (rateInformation.maxRate && rateInformation.finalRate > rateInformation.maxRate) {
                    rateInformation.finalRate = rateInformation.maxRate;
                }

                return { ...receipt, rateInformation };
            }

            // ✅ Step 5: No rate found at all
            return { ...receipt, rateInformation: null };
        })
    );


    const pagination = {
        page: page,
        pageSize: pageSize,
        total: total
    }
    console.log(`Fetched ${data.length} receipts for page ${page} with pageSize ${pageSize}. Total receipts: ${total}.`);

    const countList = await warehouseReceiptDB.getCountOfWarehouseReceipts(conn);

    console.log(`Count list of warehouse receipts:`, countList);

    return { data, ...pagination, countList };
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

export async function editWarehouseReceiptService(
    conn: Connection,
    receiptId: number,
    payload: any,
    userId: number | undefined
) {
    const currentReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!currentReceipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    console.log("Current Receipt:", currentReceipt);
    console.log("Payload:", payload);

    await conn.beginTransaction();
    try {
        const receiptPayload = payload.receipt || payload;
        const excludedFields = [
            "receiptId",
            "createdAt",
            "createdBy",
            "freightDetails",
            "removeFreightIds",
            "badFreightImages",
            "removeBadFreightImagePaths"
        ];

        const receiptUpdates: any = {};
        for (const [key, value] of Object.entries(receiptPayload || {})) {
            if (!excludedFields.includes(key)) {
                receiptUpdates[key] = value;
            }
        }

        if (Object.keys(receiptUpdates).length > 0) {
            if (userId !== undefined) {
                receiptUpdates.updatedBy = userId;
            }
            console.log("Updating receipt with:", receiptUpdates);
            await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, receiptUpdates);
            console.log("Receipt updated successfully.");

            if (receiptUpdates.status && receiptUpdates.status !== currentReceipt.status) {
                emitAuditLog({
                    receiptNumber: currentReceipt.receiptNumber,
                    receiptId,
                    proNumber: currentReceipt.proNumber || undefined,
                    userId: userId || currentReceipt.createdBy,
                    status: receiptUpdates.status,
                    description: `Status changed from ${currentReceipt.status} to ${receiptUpdates.status}`,
                    level: "INFO"
                });
            }
        }

        if (Array.isArray(payload.removeFreightIds) && payload.removeFreightIds.length > 0) {
            console.log("Removing freight info for IDs:", payload.removeFreightIds);
            for (const rawId of payload.removeFreightIds) {
                const freightId = Number(rawId);
                if (isNaN(freightId)) continue;
                console.log(`Removing freight info with ID: ${freightId}`);
                await warehouseReceiptDB.deleteFreightImagesByFreight(conn, freightId);
                console.log(`Deleted images for freight ID: ${freightId}`);
                await warehouseReceiptDB.deleteFreightInfo(conn, freightId);
                console.log(`Deleted freight info with ID: ${freightId}`);
            }
        }

        const receiptFreightDetails = Array.isArray(receiptPayload.freightDetails) ? receiptPayload.freightDetails : [];
        const topLevelFreightDetails = Array.isArray(payload.freightDetails) ? payload.freightDetails : [];
        const freightProcessingQueue = [
            ...receiptFreightDetails.map((item: any, index: number) => ({ item, payloadIndex: index, source: "receipt" })),
            ...topLevelFreightDetails.map((item: any, index: number) => ({ item, payloadIndex: index, source: "payload" }))
        ];
        const allFreightDetailsToProcess = freightProcessingQueue.map((entry) => entry?.item);
        console.log("All freight details to process:", allFreightDetailsToProcess);

        const currentFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
        const currentFreightIds = currentFreightInfos
            .map((freight: any) => Number(freight?.freightId))
            .filter((id) => !isNaN(id));

        const referencedFreightIds = new Set(
            allFreightDetailsToProcess
                .map((item: any) => Number(item?.freightId))
                .filter((id) => !isNaN(id))
        );
        const unreferencedFreightIds = currentFreightIds.filter((id) => !referencedFreightIds.has(id));

        const requiredFieldsForNewFreight = ["pieces", "type", "length", "width", "height", "weight", "cubicMeter", "freightBarcodeValue"];
        const normalizePaths = (paths: any[]) =>
            paths
                .filter((path) => typeof path === "string" && path.trim())
                .map((path) => path.trim());

        const countImageOnlyItems = freightProcessingQueue.reduce((count: number, entry) => {
            if (!entry) return count;
            const freightItem = entry.item || {};
            const newImages = normalizePaths(Array.isArray(freightItem.newImages) ? freightItem.newImages : []);
            const imagePaths = normalizePaths(Array.isArray(freightItem.images) ? freightItem.images : []);
            const removeImagePaths = normalizePaths(Array.isArray(freightItem.removeImagePaths) ? freightItem.removeImagePaths : []);
            const hasAnyImageOps = newImages.length > 0 || imagePaths.length > 0 || removeImagePaths.length > 0;
            const hasFreightDetails = requiredFieldsForNewFreight.some((field) => freightItem[field] !== undefined);
            const freightIdValue = Number(freightItem?.freightId);
            const hasFreightId = !isNaN(freightIdValue) && freightIdValue > 0;
            return count + (hasAnyImageOps && !hasFreightDetails && !hasFreightId ? 1 : 0);
        }, 0);

        if (allFreightDetailsToProcess.length > 0) {
            console.log("Processing all freight details:", allFreightDetailsToProcess);
            let assignedFreightIndex = 0;
            for (const entry of freightProcessingQueue) {
                if (!entry) continue;
                const freightItem = entry.item || {};
                const payloadIndex = entry.payloadIndex;
                let freightId = Number(freightItem?.freightId);
                const hasFreightId = !isNaN(freightId) && freightId > 0;
                const newImages = normalizePaths(Array.isArray(freightItem?.newImages) ? freightItem?.newImages : []);
                const imagePaths = normalizePaths(Array.isArray(freightItem?.images) ? freightItem?.images : []);
                const removeImagePaths = normalizePaths(Array.isArray(freightItem?.removeImagePaths) ? freightItem?.removeImagePaths : []);

                const hasFreightDetails = requiredFieldsForNewFreight.some((field) => freightItem[field] !== undefined);
                const hasImageOps = newImages.length > 0 || imagePaths.length > 0 || removeImagePaths.length > 0;

                if (!hasFreightId && !hasFreightDetails && hasImageOps) {
                    const indexedFreight = currentFreightInfos[payloadIndex];
                    const indexedFreightId = Number(indexedFreight?.freightId);

                    if (!isNaN(indexedFreightId) && indexedFreightId > 0) {
                        freightId = indexedFreightId;
                        console.log(`Assigning image-only freight payload at index ${payloadIndex} from ${entry.source} to freightId: ${freightId}`);
                    } else if (currentFreightIds.length === 1) {
                        freightId = currentFreightIds[0];
                        console.log(`Assigning image-only freight payload to only existing freightId: ${freightId}`);
                    } else if (unreferencedFreightIds.length === 1 && countImageOnlyItems === 1) {
                        freightId = unreferencedFreightIds[0];
                        console.log(`Assigning image-only freight payload to unreferenced freightId: ${freightId}`);
                    } else {
                        throw new Error(
                            "Invalid freight detail entry: freightId is required when only image operations are provided unless the receipt has a single freight item or the payload index maps to an existing freight row."
                        );
                    }
                }

                const freightBarcodeValue = `FRT${assignedFreightIndex + 1}`;
                assignedFreightIndex += 1;

                const updateData: any = {};
                const fields = ["pieces", "type", "length", "width", "height", "weight", "cubicMeter", "freightBarcodeValue"];
                for (const field of fields) {
                    if (freightItem[field] !== undefined) {
                        updateData[field] = freightItem[field];
                    }
                }
                updateData.freightBarcodeValue = freightBarcodeValue;

                if (freightId && !isNaN(freightId)) {
                    if (Object.keys(updateData).length > 0) {
                        console.log(`Updating freight info with ID: ${freightId} and data:`, updateData);
                        console.log("updateData", updateData);
                        await warehouseReceiptDB.updateFreightInfo(conn, freightId, updateData);
                        console.log(`Freight info with ID: ${freightId} updated successfully.`);
                    }

                    if (removeImagePaths.length > 0) {
                        console.log(`Removing freight images for freight ID: ${freightId} with paths:`, removeImagePaths);
                        for (const imagePath of removeImagePaths) {
                            console.log(`Removing freight image for freight ID: ${freightId} with path: ${imagePath}`);
                            await warehouseReceiptDB.deleteFreightImageByPath(conn, freightId, imagePath);
                            console.log(`Removed freight image for freight ID: ${freightId} with path: ${imagePath}`);
                        }
                    }

                    if (newImages.length > 0 || imagePaths.length > 0) {
                        const existingImages = await warehouseReceiptDB.getFreightImages(conn, freightId);
                        const existingPaths = existingImages.map((image: any) => image.imagePath || image.imageUrl || "");
                        for (const imagePath of [...imagePaths, ...newImages]) {
                            if (!existingPaths.includes(imagePath)) {
                                console.log(`Creating freight image for freight ID: ${freightId} with path: ${imagePath} (length: ${imagePath.length})`);
                                await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                                console.log(`Created freight image for freight ID: ${freightId} with path: ${imagePath}`);
                                existingPaths.push(imagePath);
                            }
                        }
                    }
                } else {
                    const newFreightData: any = {
                        receiptId,
                        pieces: freightItem.pieces,
                        type: freightItem.type,
                        length: freightItem.length,
                        width: freightItem.width,
                        height: freightItem.height,
                        weight: freightItem.weight,
                        cubicMeter: freightItem.cubicMeter,
                        freightBarcodeValue
                    };

                    const missingFields = requiredFieldsForNewFreight.filter((field) => newFreightData[field] === undefined);
                    if (missingFields.length > 0) {
                        throw new Error(
                            `Cannot create new freight item without required fields: ${missingFields.join(", ")}`
                        );
                    }

                    console.log("Creating new freight info with data:", newFreightData);

                    const createdFreightId = await warehouseReceiptDB.createFreightInfo(conn, newFreightData);
                    console.log(`Created freight info with ID: ${createdFreightId}`);
                    for (const imagePath of [...imagePaths, ...newImages]) {
                        console.log(`Creating freight image for new freight ID: ${createdFreightId} with path: ${imagePath}`);
                        await warehouseReceiptDB.createFreightImage(conn, createdFreightId, imagePath);
                        console.log(`Created freight image for freight ID: ${createdFreightId} with path: ${imagePath}`);
                    }
                }
            }
        }

        console.log("Handling bad freight condition images for receipt ID:", receiptId);

        if (Array.isArray(payload.removeBadFreightImagePaths) && payload.removeBadFreightImagePaths.length > 0) {
            for (const imagePath of payload.removeBadFreightImagePaths) {
                if (typeof imagePath !== "string" || !imagePath.trim()) continue;
                await warehouseReceiptDB.deleteBadFreightConditionImageByPath(conn, receiptId, imagePath.trim());
                console.log(`Removed bad freight image for receipt ID: ${receiptId} with path: ${imagePath.trim()}`);
            }
        }

        console.log("Adding new bad freight condition images for receipt ID:", receiptId);

        if (Array.isArray(payload.badFreightImages)) {
            const existingBadImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId);
            const existingBadPaths = existingBadImages.map((image: any) => image.imagePath || image.imageUrl);

            for (const imagePath of payload.badFreightImages) {
                if (typeof imagePath !== "string" || !imagePath.trim()) continue;
                const normalizedPath = imagePath.trim();
                if (!existingBadPaths.includes(normalizedPath)) {
                    await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, normalizedPath);
                    console.log(`Created bad freight image for receipt ID: ${receiptId} with path: ${normalizedPath}`);
                    existingBadPaths.push(normalizedPath);
                }
            }
        }

        await conn.commit();
        return await getWarehouseReceiptWithDetailsService(conn, receiptId);
    } catch (error) {
        console.error("Error in editWarehouseReceiptService:", error);
        await conn.rollback();
        throw error;
    }
}

/**
 * ADD FREIGHT INFO TO RECEIPT
 */
export async function addFreightInfoService(conn: Connection, freightData: Omit<FreightInfo, "freightId">) {
    const freightBarcodeValue = await getGeneratedFreightBarcodeValue(
        conn,
        freightData.receiptId,
        freightData.freightBarcodeValue
    );
    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
        ...freightData,
        freightBarcodeValue
    });

    console.log(`Creating freight info for receipt ID: ${freightData.receiptId} with data:`, freightData);
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
// export async function addAuditLogService(conn: Connection, logData: Omit<AuditLog, "auditLogId" | "eventTime">) {
//     emitAuditLog({
//         receiptNumber: logData.receiptNumber,
//         receiptId: logData.receiptId,
//         proNumber: logData.proNumber,
//         userId: logData.userId,
//         status: logData.status,
//         description: logData.description,
//         level: logData.level
//     });
//     return { message: 'Audit log queued for processing' };
// }

/**
 * ADD RATE TO RECEIPT
 */
export async function addWarehouseReceiptRateService(conn: Connection, rateData: Omit<WarehouseReceiptRate, "rateId">) {
    const rateId = await warehouseReceiptDB.createWarehouseReceiptRate(conn, rateData);
    return { rateId };
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
    const emails = tempReceipt
        ? await customerDB.getDepartmentAndPersonnelEmails(conn, tempReceipt.stationId)
        : [];
    const stationDefaultEmails = tempReceipt
        ? await customerDB.getStationDefaultEmails(conn, tempReceipt.stationId)
        : { hasDefaultEmails: 'N', emails: [] };
    return { ...tempReceipt, customerEmails: emails, stationDefaultEmails: stationDefaultEmails };
}

/**
 * CREATE WAREHOUSE RECEIPT WITH FREIGHT INFO
 * - Creates receipt, adds all freight info, and returns receipt with freight details
 * - createdBy comes from authenticated user
 */
function getDocumentFileType(file: { originalname?: string; mimetype?: string }): string {
    const extension = path.extname(file.originalname || "").toLowerCase();

    switch (extension) {
        case ".pdf":
            return "PDF";
        case ".doc":
            return "DOC";
        case ".docx":
            return "DOCX";
        case ".txt":
            return "TXT";
        case ".jpg":
        case ".jpeg":
            return "JPG";
        case ".png":
            return "PNG";
        default:
            return extension ? extension.replace(".", "").toUpperCase() : "UNKNOWN";
    }
}

export async function uploadWarehouseReceiptDocumentsService(
    conn: Connection,
    receiptId: number,
    files: Array<{ filename: string; originalname?: string; mimetype?: string }>,
    userId: number
) {
    const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!existingReceipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    if (!files || files.length === 0) {
        throw new Error("No documents were provided for upload");
    }

    const documents: any[] = [];

    await conn.beginTransaction();
    try {
        for (const file of files) {
            const storedFileName = file.filename || path.basename(file.originalname || "");
            console.log("type", getDocumentFileType(file), "file", file);
            const documentId = await warehouseReceiptDB.createWarehouseReceiptDocument(
                conn,
                receiptId,
                storedFileName,
                getDocumentFileType(file),
                userId
            );
            documents.push({ documentId: documentId.documentId, filePath: documentId.filePath, fileType: documentId.fileType, uploadedAt: documentId.uploadedAt, uploadedBy: await userDB.getUserName(conn, userId) });
        }

        await conn.commit();
        return documents;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

export async function removeWarehouseReceiptDocumentsService(
    conn: Connection,
    receiptId: number,
    documentIds?: number[]
) {
    const existingReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!existingReceipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    const existingDocuments = await warehouseReceiptDB.getDocumentsByReceiptId(conn, receiptId);
    if (!existingDocuments.length) {
        return {
            receiptId,
            removedDocumentIds: [],
            removedCount: 0,
            remainingCount: 0,
            message: "No documents found for this receipt"
        };
    }

    const normalizedDocumentIds = Array.from(new Set((documentIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id))));
    const documentsToRemove = normalizedDocumentIds.length > 0
        ? existingDocuments.filter((document) => normalizedDocumentIds.includes(Number(document.documentId)))
        : existingDocuments;

    if (!documentsToRemove.length) {
        throw new Error("No matching documents were found for the provided document IDs");
    }

    await conn.beginTransaction();
    try {
        const removedDocumentIds: number[] = [];

        for (const document of documentsToRemove) {
            await warehouseReceiptDB.deleteWarehouseReceiptDocument(conn, Number(document.documentId));
            removedDocumentIds.push(Number(document.documentId));
        }

        const remainingDocuments = await warehouseReceiptDB.getDocumentsByReceiptId(conn, receiptId);
        await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, { documents: remainingDocuments.length > 0 ? 'Y' : 'N' });
        await conn.commit();

        for (const document of documentsToRemove) {
            const filePath = document.filePath?.toString().trim();
            if (!filePath) continue;

            const candidatePaths = new Set<string>();
            if (path.isAbsolute(filePath)) {
                candidatePaths.add(filePath);
            } else {
                candidatePaths.add(path.resolve(process.cwd(), filePath));
                const configuredUploadPath = process.env.WAREHOUSE_DOC_PATH || "uploads/warehouse/documents";
                candidatePaths.add(path.resolve(process.cwd(), configuredUploadPath, filePath));
                candidatePaths.add(path.resolve(process.cwd(), "uploads/warehouse/documents", filePath));
            }

            for (const candidatePath of candidatePaths) {
                try {
                    await fs.promises.unlink(candidatePath);
                    break;
                } catch (error: any) {
                    if (error.code !== "ENOENT") {
                        console.warn(`Failed to delete document file at ${candidatePath}:`, error.message);
                    }
                }
            }
        }

        return {
            receiptId,
            removedDocumentIds,
            removedCount: removedDocumentIds.length,
            remainingCount: remainingDocuments.length,
            message: "Documents removed successfully"
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

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
        for (const [index, freight] of freightDetails.entries()) {
            const { images, ...freightData } = freight;
            const freightBarcodeValue = await getGeneratedFreightBarcodeValue(
                conn,
                receiptId,
                freightData.freightBarcodeValue,
                index
            );

            const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                ...freightData,
                receiptId,
                freightBarcodeValue
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
    userId: number,
    split?: boolean,
    parentReceiptId?: number | undefined
) {
    await conn.beginTransaction();
    try {
        const updatedReceipts = [];
        const createdReceipts = [];
        let verificationId = 0;
        let parentReceipt: WarehouseReceipt | null = null;

        if (split && parentReceiptId) {
            parentReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, parentReceiptId);
            console.log("Parent Receipt:", parentReceipt);
        }

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
            if (split && parentReceiptId && parentReceipt?.createdAt) {
                receipt.createdAt = parentReceipt.createdAt;
                receipt.parentReceipt = parentReceiptId;
            }

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
                for (const [index, freight] of freightDetails.entries()) {
                    const { images, ...freightData } = freight;
                    const freightBarcodeValue = await getGeneratedFreightBarcodeValue(
                        conn,
                        receiptId,
                        freightData.freightBarcodeValue,
                        index
                    );

                    console.log("Creating freight info for receipt ID:", receiptId, "with data:", freightData, "and images:", images);

                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId,
                        freightBarcodeValue
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

                if (split && parentReceiptId) {
                    emitAuditLog({
                        receiptNumber: updatedReceiptData.receiptNumber ? updatedReceiptData.receiptNumber : 0,
                        receiptId,
                        proNumber: updatedReceiptData.proNumber,
                        userId: userId,
                        status: "SPLIT",
                        description: `Receipt created as part of SPLIT operation from parent receipt ID ${parentReceiptId}`,
                        level: "INFO"
                    });
                }


                emitAuditLog({
                    receiptNumber: updatedReceiptData.receiptNumber ? updatedReceiptData.receiptNumber : 0,
                    receiptId,
                    proNumber: updatedReceiptData.proNumber,
                    userId: userId,
                    status: "ON_HAND",
                    description: `Receipt now ON-HAND for verification ID ${updatedReceiptData.verificationId}`,
                    level: "INFO"
                });

                if ((updatedReceiptData.toEmails && Array.isArray(updatedReceiptData.toEmails) && updatedReceiptData.toEmails.length > 0) || (receipt.tempEmails && Array.isArray(receipt.tempEmails) && receipt.tempEmails.length > 0)) {

                    let emails: string[] = [];
                    if (updatedReceiptData.toEmails && Array.isArray(updatedReceiptData.toEmails)) {
                        emails = [...updatedReceiptData.toEmails];
                    }
                    if (receipt.tempEmails && Array.isArray(receipt.tempEmails)) {
                        emails = [...emails, ...receipt.tempEmails];
                    }

                    for (const emailRecipient of emails) {
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

                console.log("Creating new warehouse receipt with freight details...");

                const entityId = await entityDB.createWarehouseEntity(conn, 'WAREHOUSE_RECEIPT', receipt.receiptNumber.toString());

                console.log("Created warehouse entity with ID:", entityId);

                const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

                console.log("Created warehouse note thread with ID:", noteThreadId);

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

                console.log("Created warehouse receipt with ID:", receiptId);

                if (Array.isArray(dataWithUser.badFreightImages)) {
                    for (const imagePath of dataWithUser.badFreightImages) {
                        await warehouseReceiptDB.createBadFreightConditionImage(conn, receiptId, imagePath);
                    }
                }

                // Create freight info records with images
                for (const [index, freight] of freightDetails.entries()) {

                    const { images, ...freightData } = freight;
                    const freightBarcodeValue = await getGeneratedFreightBarcodeValue(
                        conn,
                        receiptId,
                        freightData.freightBarcodeValue,
                        index
                    );

                    console.log("Creating freight info for receipt ID:", receiptId, "with data:", freightData, "and images:", images);

                    const freightId = await warehouseReceiptDB.createFreightInfo(conn, {
                        ...freightData,
                        receiptId,
                        freightBarcodeValue
                    });

                    console.log("Created freight info with ID:", freightId);

                    console.log("Freight info created with ID", freightId, "for receipt ID", receiptId);

                    console.log("Images for freight ID", freightId, ":", images);

                    // Create associated images if provided
                    if (Array.isArray(images)) {
                        for (const imagePath of images) {
                            const imageId = await warehouseReceiptDB.createFreightImage(conn, freightId, imagePath);
                            console.log(`Freight image created with ID ${imageId} for freight ID ${freightId}`);
                        }
                    }

                    console.log(`Freight info created with ID ${freightId} for receipt ID ${receiptId}`);
                }

                // Get complete receipt with all details
                const createdReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                const badFreightConditionImages = await warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId);
                const createdFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

                console.log("Created Receipt:", createdReceipt);
                console.log("Bad Freight Condition Images:", badFreightConditionImages);
                console.log("Created Freight Infos:", createdFreightInfos);

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

                if (split && parentReceiptId) {
                    emitAuditLog({
                        receiptNumber: createdReceiptData.receiptNumber ? createdReceiptData.receiptNumber : 0,
                        receiptId,
                        proNumber: createdReceiptData.proNumber,
                        userId: userId,
                        status: "SPLIT-FROM",
                        description: `Receipt created as part of SPLIT operation from parent receipt ID ${parentReceipt?.receiptNumber}`,
                        level: "INFO"
                    });
                }



                emitAuditLog({
                    receiptNumber: createdReceiptData.receiptNumber ? createdReceiptData.receiptNumber : 0,
                    receiptId,
                    proNumber: createdReceiptData.proNumber,
                    userId: userId,
                    status: "ON_HAND",
                    description: `Receipt now ON-HAND for verification ID ${createdReceiptData.verificationId}`,
                    level: "INFO"
                });

                if ((createdReceiptData.toEmails && Array.isArray(createdReceiptData.toEmails) && createdReceiptData.toEmails.length > 0) || (receipt.tempEmails && Array.isArray(receipt.tempEmails) && receipt.tempEmails.length > 0)) {

                    let emails: string[] = [];
                    if (createdReceiptData.toEmails && Array.isArray(createdReceiptData.toEmails)) {
                        emails = [...createdReceiptData.toEmails];
                    }
                    if (receipt.tempEmails && Array.isArray(receipt.tempEmails)) {
                        emails = [...emails, ...receipt.tempEmails];
                    }

                    for (const emailRecipient of emails) {
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

        // Collect all receipt numbers from updated and created receipts
        const receiptNumbers = [
            ...updatedReceipts.map(r => r.receiptNumber).filter(Boolean),
            ...createdReceipts.map(r => r.receiptNumber).filter(Boolean)
        ];

        console.log("Updating parent receipt status to ARCHIVED for split operation, if applicable...");

        if (split && parentReceiptId) {
            console.log(`Parent receipt fetched: ${parentReceipt ? `Receipt Number ${parentReceipt.receiptNumber}` : 'Not found'}`);
            await warehouseReceiptDB.updateWarehouseReceipt(conn, parentReceiptId, { status: "ARCHIVED", updatedBy: userId });
            console.log(`Parent receipt ID ${parentReceiptId} archived successfully.`);
            if (parentReceipt) {
                console.log(`Emitting audit log for parent receipt ID ${parentReceiptId} with receipt number ${parentReceipt.receiptNumber}...`);
                emitAuditLog({
                    receiptNumber: parentReceipt.receiptNumber ? parentReceipt.receiptNumber : 0,
                    receiptId: parentReceiptId,
                    proNumber: parentReceipt.proNumber,
                    userId: userId,
                    status: "ARCHIVED",
                    description: `Receipt ${parentReceipt.receiptNumber} has been split into ${receiptNumbers.join(', ')}`,
                    level: "INFO"
                });
            }
        }

        await conn.commit();



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

        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);

        if (!receipt) {
            throw new Error(`Receipt not found`);
        }

        // Update receipt status to REJECTED and add rejection reason
        await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, {
            status: 'REJECTED',
            rejectionReason: reason,
            updatedBy: userId
        });

        emitAuditLog({
            receiptNumber: receipt.receiptNumber,
            receiptId,
            proNumber: receipt.proNumber,
            userId: userId,
            status: "REJECTED",
            description: `Receipt rejected with reason: ${reason}`,
            level: "INFO"
        });
        console.log(`📝 Audit log queued for receipt #${receipt.receiptNumber}`);

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
        throw new Error(`Customer not found with customer name: ${proDetail.customerName} with account number: ${proDetail.customrAccountNumber}`);
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

    const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, station.stationId);

    const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, station.stationId);

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
        receiptNumber: receiptNumber,
        customerEmails: emails,
        stationDefaultEmails: stationDefaultEmails
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

async function getGeneratedFreightBarcodeValue(
    conn: Connection,
    receiptId: number | bigint | undefined,
    providedBarcode?: string | null,
    index?: number
) {
    const trimmedBarcode = typeof providedBarcode === "string" ? providedBarcode.trim() : "";
    if (trimmedBarcode) {
        return trimmedBarcode;
    }

    if (typeof index === "number") {
        return `FRT${index + 1}`;
    }

    if (receiptId !== undefined && receiptId !== null) {
        const existingFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, Number(receiptId));
        return `FRT${existingFreightInfos.length + 1}`;
    }

    return "FRT1";
}

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
        freightBarcodeValue?: string;
        type?: string;
        length?: number;
        width?: number;
        weight?: number;
        height?: number;
    }
) {
    const printerPort = payload.printerPort ? Number(payload.printerPort) : undefined;
    const printerIP = payload.printerIP;
    const normalizedReceiptNumber = payload.receiptNumber !== undefined && payload.receiptNumber !== null
        ? Number(payload.receiptNumber)
        : undefined;

    if (!printerPort || !printerIP || !normalizedReceiptNumber) {
        throw new Error("printerPort, printerIP, and receiptNumber are required");
    }

    const printDataList: Array<{
        labelCount: number;
        receiptNumber: number;
        customerName: string;
        packageId: string;
        shipper: string;
        carrierName: string;
        proNumber: string;
        destination: string;
        pieces: number;
        freightBarcodeValue: string;
        type: string;
        length: number;
        width: number;
        weight: number;
        height: number;
    }> = [];

    // If full payload is provided, use it directly and create a single label.
    if (payload.customerName && payload.shipper && payload.carrierName) {
        printDataList.push({
            labelCount: payload.labelCount && payload.labelCount > 0 ? payload.labelCount : 1,
            receiptNumber: normalizedReceiptNumber,
            customerName: payload.customerName,
            packageId: payload.packageId || "",
            shipper: payload.shipper,
            carrierName: payload.carrierName,
            proNumber: payload.proNumber || "",
            destination: payload.destination || "",
            pieces: payload.pieces || 0,
            freightBarcodeValue: payload.freightBarcodeValue || "",
            type: payload.type || "",
            length: payload.length || 0,
            width: payload.width || 0,
            weight: payload.weight || 0,
            height: payload.height || 0
        });
    } else {
        const receipt = await warehouseReceiptDB.getAllWarehouseReceiptByReceiptNumber(conn, normalizedReceiptNumber) as any | null;
        if (!receipt) {
            throw new Error(`Receipt with number ${normalizedReceiptNumber} not found`);
        }

        const freightInformation = receipt.receiptId
            ? await warehouseReceiptDB.getFreightInfosByReceipt(conn, Number(receipt.receiptId))
            : [];

        if (freightInformation.length > 0) {
            for (const freight of freightInformation) {
                printDataList.push({
                    labelCount: payload.labelCount && payload.labelCount > 0 ? payload.labelCount : 1,
                    receiptNumber: Number(receipt.receiptNumber),
                    customerName: receipt.customerName || "",
                    packageId: receipt.packageId || "",
                    shipper: receipt.shipper || "",
                    carrierName: receipt.carrierName || "",
                    proNumber: receipt.proNumber || "",
                    destination: receipt.destination || "",
                    pieces: freight.pieces != null ? Number(freight.pieces) : (receipt.piecesInland || 0),
                    freightBarcodeValue: freight.freightBarcodeValue || receipt.freightBarcodeValue || "",
                    type: freight.type || receipt.type || "",
                    length: freight.length != null ? Number(freight.length) : (receipt.length || 0),
                    width: freight.width != null ? Number(freight.width) : (receipt.width || 0),
                    weight: freight.weight != null ? Number(freight.weight) : (receipt.weight || 0),
                    height: freight.height != null ? Number(freight.height) : (receipt.height || 0)
                });
            }
        } else {
            printDataList.push({
                labelCount: receipt.labelCount && receipt.labelCount > 0 ? receipt.labelCount : 1,
                receiptNumber: Number(receipt.receiptNumber),
                customerName: receipt.customerName || "",
                packageId: receipt.packageId || "",
                shipper: receipt.shipper || "",
                carrierName: receipt.carrierName || "",
                proNumber: receipt.proNumber || "",
                destination: receipt.destination || "",
                pieces: receipt.piecesInland || 0,
                freightBarcodeValue: receipt.freightBarcodeValue || "",
                type: receipt.type || "",
                length: receipt.length || 0,
                width: receipt.width || 0,
                weight: receipt.weight || 0,
                height: receipt.height || 0
            });
        }
    }

    const zpl = printDataList.map((printData) => dataToZPL(printData)).join("");
    await sendZplToPrinter(zpl, printerIP, printerPort);
    return {
        success: true,
        printedTo: printerIP,
        printerPort,
        printData: printDataList.length > 1 ? printDataList : printDataList[0]
    };
}

export async function getAuditLogsForReceiptService(conn: Connection, receiptId: number) {
    const auditLogs = await warehouseReceiptDB.getAuditLogsByReceiptId(conn, receiptId);
    return auditLogs;
}

export async function updateWarehouseReceiptLocationService(conn: Connection, receiptId: number, location: string, userId: number) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);

    console.log(`Updating location for receipt ID ${receiptId} to ${location} by user ID ${userId}`);
    if (!receipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }
    const data = warehouseReceiptDB.updateWarehouseReceiptLocation(conn, receiptId, location);

    emitAuditLog({
        receiptNumber: receipt.receiptNumber ? receipt.receiptNumber : 0,
        receiptId,
        proNumber: receipt.proNumber,
        userId: userId,
        status: "LOCATION_UPDATED",
        description: `Receipt location updated from ${receipt.location} to ${location}`,
        level: "INFO"
    });

    return data;
}

export async function warehouseReceiptAccountHoldService(conn: Connection, receiptIds: number[], userId: number) {
    console.log(`Updating account hold status for receipts ${receiptIds} by user ID ${userId}`);
    for (const receiptId of receiptIds) {
        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        if (!receipt) {
            throw new Error(`Receipt with ID ${receiptId} not found`);
        }

        await warehouseReceiptDB.warehouseReceiptAccountHold(conn, receiptId, 'Y', 'PENDING');

        emitAuditLog({
            receiptNumber: receipt.receiptNumber ? receipt.receiptNumber : 0,
            receiptId,
            proNumber: receipt.proNumber,
            userId: userId,
            status: "ACCOUNT_ON_HOLD",
            description: `Receipt account status updated to ON HOLD`,
            level: "INFO"
        });
    }
}

export async function warehouseReceiptAccountHoldRevertService(conn: Connection, receiptIds: number[], userId: number) {
    for (const receiptId of receiptIds) {
        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        if (!receipt) {
            throw new Error(`Receipt with ID ${receiptId} not found`);
        }

        await warehouseReceiptDB.warehouseReceiptAccountHold(conn, receiptId, 'N', 'APPROVED');

        emitAuditLog({
            receiptNumber: receipt.receiptNumber ? receipt.receiptNumber : 0,
            receiptId,
            proNumber: receipt.proNumber,
            userId: userId,
            status: "ACCOUNT_ON_HOLD_REVERTED",
            description: `Receipt account status reverted to APPROVED`,
            level: "INFO"
        });
    }
}


export async function warehouseReceiptRateReadyForApprovalService(conn: Connection, receiptId: number, rateDetails: { rate: number, dimFactor: number, baseRate: number, minRate: number, maxRate: number, hasFlatRate: 'Y' | 'N', notesForFlatRate: string | null }, userId: number) {

    await conn.beginTransaction();

    try {
        const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
        if (!receipt) {
            throw new Error(`Receipt with ID ${receiptId} not found`);
        }

        if (rateDetails.hasFlatRate) {
            await warehouseReceiptDB.updateWarehouseReceiptForReadyForApproval(conn, receiptId, {
                approvalStatus: 'READY',
                hasFlatRate: rateDetails.hasFlatRate,
                notesForFlatRate: rateDetails.notesForFlatRate ? rateDetails.notesForFlatRate : null,
                requestedBy: userId
            });
        }


        const rate = await warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId);
        if (!rate) {
            await warehouseReceiptDB.createWarehouseReceiptRate(conn, {
                receiptId,
                rate: rateDetails.rate,
                dimFactor: rateDetails.dimFactor,
                baseRate: rateDetails.baseRate,
                minRate: rateDetails.minRate,
                maxRate: rateDetails.maxRate
            });
        } else {
            await warehouseReceiptDB.updateWarehouseReceiptRate(conn, receiptId, {
                rate: rateDetails.rate,
                dimFactor: rateDetails.dimFactor,
                baseRate: rateDetails.baseRate,
                minRate: rateDetails.minRate,
                maxRate: rateDetails.maxRate
            });
        }

        emitAuditLog({
            receiptNumber: receipt.receiptNumber ? receipt.receiptNumber : 0,
            receiptId,
            proNumber: receipt.proNumber,
            userId: userId,
            status: "READY_FOR_APPROVAL",
            description: `Rate details updated and ready for approval by user ID ${await userDB.getUserName(conn, userId)}`,
            level: "INFO"
        });

        await conn.commit();
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }

}

export async function warehouseReceiptRateApproveService(conn: Connection, receiptIds: number[], userId: number) {
    await conn.beginTransaction();
    try {
        const approverName = await userDB.getUserName(conn, userId);

        for (const receiptId of receiptIds) {
            const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
            if (!receipt) {
                throw new Error(`Receipt with ID ${receiptId} not found`);
            }
            await warehouseReceiptDB.updateWarehouseReceiptApproval(conn, receiptId, {
                approvalStatus: 'APPROVED',
                accountOnHold: 'N',
                approvedBy: userId
            });

            emitAuditLog({
                receiptNumber: receipt.receiptNumber ? receipt.receiptNumber : 0,
                receiptId,
                proNumber: receipt.proNumber,
                userId: userId,
                status: "RATE_APPROVED",
                description: `Receipt rate approved by user ID ${approverName}`,
                level: "INFO"
            });
        }

        await conn.commit();
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
}

export async function exportWarehouseReceiptsToSpreadsheetService(
    conn: Connection,
    status?: string,
    approvalStatus?: string,
    receiptNumber?: string,
    accounting?: boolean,
    filters?: {
        startDate?: string;
        endDate?: string;
        customerId?: number;
        stationId?: number;
        carrierId?: number;
        location?: string;
        proNumber?: string;
        verificationId?: number;
        destination?: string;
        packageId?: string;
        customerRefNumber?: string;
    }
) {


    const { data: receipts } = await warehouseReceiptDB.listWarehouseReceipts(
        conn,
        undefined, // page
        undefined, // pageSize
        status,
        approvalStatus,
        receiptNumber,
        accounting,
        filters
    );

    if (!receipts || receipts.length === 0) {
        throw new Error("No Record Found");
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Warehouse Receipts");

    // Define columns
    worksheet.columns = [
        { header: "Warehouse Receipt ID", key: "receiptNumber", width: 20 },
        { header: "Customer Name", key: "customerName", width: 30 },
        { header: "Station Name", key: "stationName", width: 25 },
        { header: "Carrier", key: "carrierName", width: 20 },
        { header: "Location", key: "location", width: 20 },
        { header: "Pro Number", key: "proNumber", width: 20 },
        { header: "Destination", key: "destination", width: 25 },
        { header: "Created Date", key: "createdDate", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "ID Verification Number", key: "idVerification", width: 25 },
        { header: "Package ID", key: "packageId", width: 25 },
        { header: "Customer Ref Number", key: "customerRefNumber", width: 25 },
    ];

    // Map receipts into rows
    const rows = receipts.map((r: any) => ({
        receiptNumber: r.receiptNumber || "",
        customerName: r.customerName || "",
        stationName: r.stationName || "",
        carrierName: r.carrierName || "",
        location: r.location || "",
        proNumber: r.proNumber || "",
        destination: r.destination || "",
        createdDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
        status: r.status || "",
        idVerification: r.verificationId || "",
        packageId: r.packageId || "",
        customerRefNumber: r.customerRefNumber || "",
    }));

    worksheet.addRows(rows);

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });
    });

    return workbook;
}


export async function sendWarehouseReceiptToCustomEmailService(
    conn: Connection,
    receiptId: number,
    emails: string[],
    userId: number
) {
    const receipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
    if (!receipt) {
        throw new Error(`Receipt with ID ${receiptId} not found`);
    }

    const freightInformation = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
    const freightWithImages = await Promise.all(
        freightInformation.map(async (freight) => ({
            ...freight,
            images: await warehouseReceiptDB.getFreightImages(conn, freight.freightId)
        }))
    );

    const [rate, auditLogs, documents, badFreightConditionImages, customerEmails, stationDefaultEmails] = await Promise.all([
        warehouseReceiptDB.getWarehouseReceiptRate(conn, receiptId),
        warehouseReceiptDB.getAuditLogsByReceipt(conn, receiptId),
        warehouseReceiptDB.getDocumentsByReceiptId(conn, receiptId),
        warehouseReceiptDB.getBadFreightConditionImages(conn, receiptId),
        customerDB.getDepartmentAndPersonnelEmails(conn, receipt.stationId),
        customerDB.getStationDefaultEmails(conn, receipt.stationId)
    ]);

    const receiptWithDetails = {
        ...receipt,
        freightInformation: freightWithImages,
        rate,
        auditLogs,
        uploadedDocuments: documents,
        badFreightConditionImages,
        customerEmails,
        stationDefaultEmails
    };

    const tempReceiptOutPath = ensureUploadDirExists(process.env.TEMP_RECEIPT_OUTPUT);
    const pdfFilePath = await createWarehouseReceiptPDF(receiptWithDetails, false, tempReceiptOutPath);
    const emailStatus = typeof receiptWithDetails.status === "string" && ["INITIATED", "ON_HAND", "SHIPPED", "DISCARDED", "REJECTED", "ACCEPTED"].includes(receiptWithDetails.status)
        ? receiptWithDetails.status as any
        : undefined;

    const attachments = [pdfFilePath];

    if (Array.isArray(documents) && documents.length > 0) {
        const documentsOutPath = ensureUploadDirExists(process.env.WAREHOUSE_DOC_PATH);
        const fullDocPaths = documents.map(
            (doc: any) => path.join(documentsOutPath, doc.filePath)
        );
        attachments.push(...fullDocPaths);
    }

    const attachmentString = attachments.join(";");

    for (const emailRecipient of emails) {
        // emitEmail will queue email notification asynchronously
        emitEmail({
            receiptNumber: receiptWithDetails.receiptNumber,
            to: emailRecipient,
            status: emailStatus,
            hasAttachment: true,
            attachmentPath: attachmentString
        });
    }

}

/**
 * GET RECEIPT FOR SHIPMENT CREATION
 * Accepts optional filters: receiptNumber, startDate, endDate, proNumbers (array)
 */
export async function getWarehouseReceiptForShipmentService(
    conn: Connection,
    filters: { receiptNumber?: number; startDate?: string; endDate?: string; proNumbers?: string[] }
) {
    const receiptNumber = filters.receiptNumber;
    const startDate = filters.startDate;
    const endDate = filters.endDate;
    const proNumbers = Array.isArray(filters.proNumbers) ? filters.proNumbers : (filters.proNumbers ? [String(filters.proNumbers)] : undefined);

    const result = await warehouseReceiptDB.getWarehouseReceiptForShipment(conn, receiptNumber, startDate, endDate, proNumbers as any);
    if (!result) return null;

    return Promise.all(result.map(async (receipt) => {
        const freightInfo = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
        const scannedItems = freightInfo.filter((freight) => String(freight.isScanned).toUpperCase() === "Y");
        const unscannedItems = freightInfo.filter((freight) => String(freight.isScanned).toUpperCase() !== "Y");

        return {
            ...receipt,
            freightSummary: {
                total: freightInfo.length,
                scanned: scannedItems.length,
                unscanned: unscannedItems.length,
                scannedItems,
                unscannedItems,
            },
        };
    }));
}

export async function createFreightInfoTempService(conn: Connection) {
    await conn.beginTransaction();
    try {
        const freightBarcodeValue = await warehouseReceiptDB.createFreightInfoTemp(conn);
        await conn.commit();
        return freightBarcodeValue;
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}