import { Connection } from "odbc";
import * as shipmentDB from "../../database/shipment";
import * as entityDB from "../../database/maintanance/entity";
import * as noteDB from "../../database/maintanance/note";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import { emitAuditLog } from "../../utils/email";
import { CreateWarehouseShipment, UpdateWarehouseShipment, WarehouseShipmentWithRelations } from "../../entities/shipment";

function normalizeBarcodeNumber(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

function throwValidationError(message: string): never {
    const error = new Error(message) as Error & { statusCode?: number };
    error.name = "ValidationError";
    error.statusCode = 400;
    throw error;
}

function normalizeShipmentPayload(payload: CreateWarehouseShipment | UpdateWarehouseShipment, userId: number) {
    const normalized = {
        ...payload,
        customerId: Number((payload as any).customerId),
        stationId: Number((payload as any).stationId),
        consigneeId: Number((payload as any).consigneeId),
        pieces: Number((payload as any).pieces),
        weight: Number((payload as any).weight),
        isCanceled: "N",
        isShipped: "N",
        isScanned: "N",
        pickupEntry: "N",
        barcodeNumber: normalizeBarcodeNumber((payload as any).barcodeNumber),
        airBillNumber: (payload as any).airBillNumber ?? "",
        booking: (payload as any).booking ?? "",
        customerRefNumber: (payload as any).customerRefNumber ?? "",
        additionalRefNumber: (payload as any).additionalRefNumber ?? "",
        instructions: (payload as any).instructions ?? "",
        pickupEntryNumber: null,
        createdBy: (payload as any).createdBy ?? userId,
        updatedBy: (payload as any).updatedBy ?? userId,
    };

    delete (normalized as any).containers;
    delete (normalized as any).receipts;
    return normalized;
}

export async function createShipmentWithRelations(
    conn: Connection,
    payload: CreateWarehouseShipment,
    userId: number
): Promise<WarehouseShipmentWithRelations> {
    const normalizedPayload = normalizeShipmentPayload(payload, userId);

    if (normalizedPayload.barcodeNumber) {
        const duplicateBarcode = await shipmentDB.checkShipmentUniqueFields(conn, { barcodeNumber: normalizedPayload.barcodeNumber });
        if (duplicateBarcode) {
            throwValidationError(`Duplicate barcode number "${normalizedPayload.barcodeNumber}" already exists in another shipment record.`);
        }
    }

    try {
        await conn.beginTransaction();

        const entityId = await entityDB.createWarehouseEntity(conn, 'SHIPMENT', normalizedPayload.barcodeNumber);
        const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

        normalizedPayload.entityId = entityId;
        normalizedPayload.noteThreadId = noteThreadId;

        const shipmentId = await shipmentDB.createShipment(conn, normalizedPayload as any, userId);

        if (payload.containers !== undefined) {
            console.log(`Creating shipment with ${payload.containers.length} containers`);
            await shipmentDB.replaceContainers(conn, shipmentId, payload.containers ?? []);
        }
        if (payload.receipts !== undefined) {
            console.log(`Creating shipment with ${payload.receipts.length} receipts`);
            await shipmentDB.replaceReceipts(conn, shipmentId, payload.receipts ?? []);

            await Promise.all(payload.receipts.map(async (receipt) => {
                const freightInfo = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
                const scannedItems = freightInfo.filter(f => f.isScanned === 'Y');
                const unscannedItems = freightInfo.filter(f => f.isScanned === 'N' || f.isScanned === null || f.isScanned === undefined);
                (receipt as any).freightSummary = {
                    total: freightInfo.length,
                    scanned: scannedItems.length,
                    unscanned: unscannedItems.length,
                    scannedItems: scannedItems,
                    unscannedItems: unscannedItems,
                };
                await warehouseReceiptDB.updateWarehouseReceipt(conn, receipt.receiptId, { status: "PREPARED" });
            }));
        }

        await conn.commit();

        const shipment = await getShipmentById(conn, shipmentId);
        if (!shipment) {
            throw new Error("Shipment could not be loaded after creation");
        }

        return shipment;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

export async function updateShipmentWithRelations(
    conn: Connection,
    shipmentId: number,
    payload: UpdateWarehouseShipment,
    userId: number
): Promise<WarehouseShipmentWithRelations> {
    const normalizedPayload = normalizeShipmentPayload(payload, userId);
    const existingShipment = await shipmentDB.getShipmentById(conn, shipmentId);

    if (!existingShipment) {
        throwValidationError(`Shipment with id ${shipmentId} was not found.`);
    }

    if (typeof payload.barcodeNumber !== "undefined") {
        const incomingBarcode = normalizeBarcodeNumber(payload.barcodeNumber);
        const currentBarcode = normalizeBarcodeNumber(existingShipment?.barcodeNumber);

        if (incomingBarcode && incomingBarcode !== currentBarcode) {
            const duplicateBarcode = await shipmentDB.checkShipmentUniqueFields(conn, { barcodeNumber: incomingBarcode }, shipmentId);
            if (duplicateBarcode) {
                throwValidationError(`Duplicate barcode number "${incomingBarcode}" already exists in another shipment record.`);
            }
        }
    }

    try {
        await conn.beginTransaction();
        await shipmentDB.updateShipment(conn, shipmentId, normalizedPayload as any, userId);

        if (Object.prototype.hasOwnProperty.call(payload, "containers")) {
            await shipmentDB.replaceContainers(conn, shipmentId, payload.containers ?? []);
        }

        if (Object.prototype.hasOwnProperty.call(payload, "receipts")) {
            const existingReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);
            const newReceiptIds = new Set((payload.receipts ?? []).map(r => r.receiptId));
            const removedReceipts = existingReceipts.filter(er => !newReceiptIds.has(er.receiptId));

            await shipmentDB.replaceReceipts(conn, shipmentId, payload.receipts ?? []);

            // Update status for new/existing receipts to PREPARED
            await Promise.all((payload.receipts ?? []).map(async (receipt) => {
                const warehouseReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receipt.receiptId);
                const freightInfo = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
                const scannedItems = freightInfo.filter(f => f.isScanned === 'Y');
                const unscannedItems = freightInfo.filter(f => f.isScanned === 'N' || f.isScanned === null || f.isScanned === undefined);
                (receipt as any).freightSummary = {
                    total: freightInfo.length,
                    scanned: scannedItems.length,
                    unscanned: unscannedItems.length,
                    scannedItems: scannedItems,
                    unscannedItems: unscannedItems,
                };
                await warehouseReceiptDB.updateWarehouseReceipt(conn, receipt.receiptId, { status: warehouseReceipt?.status });
            }));

            // Update status for removed receipts to ON_HAND
            await Promise.all(removedReceipts.map(async (receipt) => {
                await warehouseReceiptDB.updateWarehouseReceipt(conn, receipt.receiptId, { status: "ON_HAND" });
            }));
        }


        const shipment = await getShipmentById(conn, shipmentId);
        if (!shipment) {
            throw new Error("Shipment could not be loaded after update");
        }

        await conn.commit();

        return shipment;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

export async function getShipmentById(conn: Connection, shipmentId: number): Promise<WarehouseShipmentWithRelations | null> {
    const shipment = await shipmentDB.getShipmentById(conn, shipmentId);
    if (!shipment) {
        return null;
    }

    const [containers, receipts] = await Promise.all([
        shipmentDB.getContainersByShipmentId(conn, shipmentId),
        shipmentDB.getReceiptsByShipmentId(conn, shipmentId),
    ]);


    await Promise.all(receipts.map(async (receipt) => {
        const freightInfo = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
        console.log("Freight info for receiptId", receipt.receiptId, freightInfo);
        const scannedItems = freightInfo.filter(f => f.isScanned === 'Y');
        const unscannedItems = freightInfo.filter(f => f.isScanned === 'N' || f.isScanned === null || f.isScanned === undefined);
        // (receipt as any).freightInfo = freightInfo;
        (receipt as any).freightSummary = {
            total: freightInfo.length,
            scanned: scannedItems.length,
            unscanned: unscannedItems.length,
            scannedItems: scannedItems,
            unscannedItems: unscannedItems,
        };
    }));


    return {
        ...shipment,
        containers,
        receipts,
    } as WarehouseShipmentWithRelations;
}

export async function listShipments(
    conn: Connection,
    filters: { searchTerm?: string; page?: number; pageSize?: number; scanned?: boolean; pickup?: boolean; shipped?: boolean, request?: boolean }
): Promise<{ data: WarehouseShipmentWithRelations[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const shipments = await shipmentDB.listShipments(conn, filters);
    const total = await shipmentDB.countShipments(conn, filters);

    const data: WarehouseShipmentWithRelations[] = [];
    for (const shipment of shipments) {
        const record = await getShipmentById(conn, shipment.shipmentId);
        if (record) {
            data.push(record);
        }
    }

    return { data, total, page, pageSize };
}

function hasAllFreightScanned(freightInfos: Array<{ isScanned?: unknown }>): boolean {
    if (freightInfos.length === 0) {
        return true;
    }

    return freightInfos.every((freightInfo) => String(freightInfo.isScanned).toUpperCase() === "Y");
}

export async function scanFreight(conn: Connection, shipmentId: number, barcodeValue: string) {
    const [receiptNumberPart, freightBarcodeValuePart] = barcodeValue
        .split("-")
        .map(part => part.trim())
        .filter(Boolean);

    const receiptNumber = Number(receiptNumberPart);
    const freightBarcodeValue = freightBarcodeValuePart ?? "";

    if (!receiptNumber || !freightBarcodeValue) {
        throwValidationError("Barcode value must be in the format receiptNumber-freightBarcodeValue.");
    }

    try {
        await conn.beginTransaction();

        console.log(`Scanning freight for shipmentId: ${shipmentId}, barcodeValue: ${barcodeValue}`);
        const receipt = await warehouseReceiptDB.getAllWarehouseReceiptByReceiptNumber(conn, receiptNumber);
        if (!receipt) {
            throwValidationError(`Receipt with number ${receiptNumber} was not found.`);
        }

        const shipmentReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);
        const isReceiptLinkedToShipment = shipmentReceipts.some((shipmentReceipt: any) => Number(shipmentReceipt.receiptId) === Number(receipt.receiptId));
        if (!isReceiptLinkedToShipment) {
            throwValidationError(`Receipt ${receiptNumber} is not associated with shipment ${shipmentId}.`);
        }

        const freightInfos = await warehouseReceiptDB.getFreightInfosForScanByReceipt(conn, receipt.receiptId);
        const matchedFreight = freightInfos.find((freightInfo: any) => {
            const existingBarcode = normalizeBarcodeNumber(freightInfo.freightBarcodeValue);
            const incomingBarcode = normalizeBarcodeNumber(freightBarcodeValue);
            return existingBarcode && incomingBarcode && existingBarcode.toUpperCase() === incomingBarcode.toUpperCase();
        });

        if (!matchedFreight) {
            throwValidationError(`Freight barcode "${freightBarcodeValue}" was not found for receipt ${receiptNumber}.`);
        }

        if (String(matchedFreight.isScanned).toUpperCase() === "Y") {
            throwValidationError("Item already scanned");
        }

        await warehouseReceiptDB.updateFreightInfo(conn, Number(matchedFreight.freightId), { isScanned: "Y" });

        const receiptFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
        const currentReceiptFullyScanned = hasAllFreightScanned(receiptFreightInfos);

        if (currentReceiptFullyScanned) {
            await warehouseReceiptDB.updateWarehouseReceipt(conn, Number(receipt.receiptId), { status: "SCANNED" });
        }

        const allShipmentsReceiptsScanned = (await Promise.all(shipmentReceipts.map(async (shipmentReceipt: any) => {
            const receiptId = Number(shipmentReceipt.receiptId);
            const shipmentReceiptFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
            return hasAllFreightScanned(shipmentReceiptFreightInfos);
        }))).every(Boolean);

        if (allShipmentsReceiptsScanned) {
            await shipmentDB.updateShipment(conn, shipmentId, { isScanned: "Y" }, 0);
        }

        const record = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return record; // Return the updated shipment record after scanning the freight


    } catch (error) {
        await conn.rollback();
        console.error("Error occurred while scanning freight:", error);
        throw error;
    }
}

export async function unscanFreight(conn: Connection, shipmentId: number, barcodeValue: string) {
    const [receiptNumberPart, freightBarcodeValuePart] = barcodeValue
        .split("-")
        .map(part => part.trim())
        .filter(Boolean);

    const receiptNumber = Number(receiptNumberPart);
    const freightBarcodeValue = freightBarcodeValuePart ?? "";

    if (!receiptNumber || !freightBarcodeValue) {
        throwValidationError("Barcode value must be in the format receiptNumber-freightBarcodeValue.");
    }

    try {
        await conn.beginTransaction();

        console.log(`Un-scanning freight for shipmentId: ${shipmentId}, barcodeValue: ${barcodeValue}`);
        const receipt = await warehouseReceiptDB.getAllWarehouseReceiptByReceiptNumber(conn, receiptNumber);
        if (!receipt) {
            throwValidationError(`Receipt with number ${receiptNumber} was not found.`);
        }

        const shipmentReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);
        const isReceiptLinkedToShipment = shipmentReceipts.some((shipmentReceipt: any) => Number(shipmentReceipt.receiptId) === Number(receipt.receiptId));
        if (!isReceiptLinkedToShipment) {
            throwValidationError(`Receipt ${receiptNumber} is not associated with shipment ${shipmentId}.`);
        }

        const freightInfos = await warehouseReceiptDB.getFreightInfosForScanByReceipt(conn, receipt.receiptId);
        const matchedFreight = freightInfos.find((freightInfo: any) => {
            const existingBarcode = normalizeBarcodeNumber(freightInfo.freightBarcodeValue);
            const incomingBarcode = normalizeBarcodeNumber(freightBarcodeValue);
            return existingBarcode && incomingBarcode && existingBarcode.toUpperCase() === incomingBarcode.toUpperCase();
        });

        if (!matchedFreight) {
            throwValidationError(`Freight barcode "${freightBarcodeValue}" was not found for receipt ${receiptNumber}.`);
        }

        if (String(matchedFreight.isScanned).toUpperCase() !== "Y") {
            throwValidationError("Item is not scanned");
        }

        await warehouseReceiptDB.updateFreightInfo(conn, Number(matchedFreight.freightId), { isScanned: "N" });

        const receiptFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receipt.receiptId);
        const currentReceiptFullyScanned = hasAllFreightScanned(receiptFreightInfos);

        if (!currentReceiptFullyScanned) {
            await warehouseReceiptDB.updateWarehouseReceipt(conn, Number(receipt.receiptId), { status: "PREPARED" });
        }

        const allShipmentsReceiptsScanned = (await Promise.all(shipmentReceipts.map(async (shipmentReceipt: any) => {
            const receiptId = Number(shipmentReceipt.receiptId);
            const shipmentReceiptFreightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
            return hasAllFreightScanned(shipmentReceiptFreightInfos);
        }))).every(Boolean);

        if (!allShipmentsReceiptsScanned) {
            await shipmentDB.updateShipment(conn, shipmentId, { isScanned: "N" }, 0);
        }

        const record = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return record;

    } catch (error) {
        await conn.rollback();
        console.error("Error occurred while un-scanning freight:", error);
        throw error;
    }
}

export async function signOffShipment(conn: Connection, shipmentId: number, userId: number) {
    const existingShipment = await shipmentDB.getShipmentById(conn, shipmentId);

    if (!existingShipment) {
        throwValidationError(`Shipment with id ${shipmentId} was not found.`);
    }

    try {
        await conn.beginTransaction();

        const shipmentReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);
        const partialScanned: number[] = [];
        const fullyUnscanned: number[] = [];

        for (const receipt of shipmentReceipts) {
            const receiptId = Number((receipt as any).receiptId);
            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

            const scannedCount = freightInfos.filter(f => String((f as any).isScanned).toUpperCase() === 'Y').length;
            const unscannedCount = freightInfos.filter(f => String((f as any).isScanned).toUpperCase() !== 'Y').length;

            if (scannedCount > 0 && unscannedCount > 0) {
                // partially scanned
                partialScanned.push(receiptId);
            } else if (scannedCount === 0 && unscannedCount > 0) {
                // fully unscanned
                fullyUnscanned.push(receiptId);
            }
        }

        if (partialScanned.length > 0) {
            throwValidationError(`Cannot sign off while some receipts are partially scanned. Partial receipts: ${partialScanned.join(", ")}`);
        }


        // Move fully unscanned receipts to ON_HAND, unlink them from the shipment, and emit audit logs
        for (const receiptId of fullyUnscanned) {
            await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, { status: 'ON_HAND', updatedBy: userId });

            try {
                const wh = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
                if (wh) {
                    emitAuditLog({
                        receiptNumber: wh.receiptNumber,
                        receiptId: Number(receiptId),
                        proNumber: (wh as any)?.proNumber || undefined,
                        userId,
                        status: 'ON_HAND',
                        description: `Moved to ON_HAND during sign-off for shipment ${shipmentId}`,
                        level: 'INFO'
                    });
                }
            } catch (err) {
                console.warn(`Failed to emit audit log for receipt ${receiptId}:`, err);
            }
        }

        // Re-map shipment receipts to exclude those moved to ON_HAND
        const remainingReceiptIds = shipmentReceipts
            .map(r => Number(r.receiptId))
            .filter(id => !fullyUnscanned.includes(id));

        await shipmentDB.replaceReceipts(conn, shipmentId, remainingReceiptIds.map(id => ({ receiptId: id })));

        // Recalculate shipment pieces and weight based on remaining receipts
        let totalPieces = 0;
        let totalWeight = 0;
        for (const rid of remainingReceiptIds) {
            const wh = await warehouseReceiptDB.getWarehouseReceiptById(conn, rid);
            if (wh) {
                totalPieces += Number(wh.piecesInland) || 0;
                totalWeight += Number(wh.reWeight) || 0;
            }
        }

        await shipmentDB.updateShipment(conn, shipmentId, { pieces: totalPieces, weight: totalWeight }, userId);

        // Check whether all remaining receipts are fully scanned
        let allRemainingScanned = true;
        for (const rid of remainingReceiptIds) {
            const infos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, rid);
            if (!hasAllFreightScanned(infos)) {
                allRemainingScanned = false;
                break;
            }
        }

        // If all remaining receipts are scanned (or none remain), mark shipment scanned+shipped and approve completion
        if (allRemainingScanned) {
            await shipmentDB.updateShipment(conn, shipmentId, { isScanned: 'Y', isShipped: 'Y' }, userId);
            await shipmentDB.approveShipmentCompletion(conn, shipmentId, userId, 'APPROVED');
        }

        const record = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return record;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

export async function shipmentSplitApproval(conn: Connection, shipmentId: number, userId: number) {
    const existingShipment = await shipmentDB.getShipmentById(conn, shipmentId);

    if (!existingShipment) {
        throwValidationError(`Shipment with id ${shipmentId} was not found.`);
    }

    try {
        await conn.beginTransaction();

        const shipmentReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);

        // Collect current receipt ids so we can re-map them after potential splits
        const currentReceiptIds = shipmentReceipts.map(r => Number(r.receiptId));

        for (const receiptRef of shipmentReceipts) {
            const receiptId = Number(receiptRef.receiptId);

            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

            const scannedItems = freightInfos.filter(f => String(f.isScanned).toUpperCase() === 'Y');
            const unscannedItems = freightInfos.filter(f => String(f.isScanned).toUpperCase() !== 'Y');

            // No split required when fully scanned or fully unscanned
            if (scannedItems.length === 0 || unscannedItems.length === 0) {
                continue;
            }

            // Partial scan -> split the receipt
            const originalReceipt = await warehouseReceiptDB.getWarehouseReceiptById(conn, receiptId);
            if (!originalReceipt) continue;

            // Create a temp receipt to reserve a receipt number, then build payload for new receipt
            const tempReceiptPayload: any = {
                verificationId: originalReceipt.verificationId ?? null,
                receiptDate: originalReceipt.receiptDate,
                shipper: originalReceipt.shipper ?? '',
                customerId: Number(originalReceipt.customerId),
                stationId: Number(originalReceipt.stationId),
                carrierId: Number(originalReceipt.carrierId),
                createdBy: userId,
                status: 'ON_HAND',
                destination: originalReceipt.destination ?? null,
                proNumber: originalReceipt.proNumber ?? null,
                packageId: originalReceipt.packageId ?? null,
                location: originalReceipt.location ?? null,
                receivedBy: originalReceipt.receivedBy ?? null,
            };

            const reservedReceiptNumber = await warehouseReceiptDB.createWarehouseReceiptTemp(conn, tempReceiptPayload);

            const entityId = await entityDB.createWarehouseEntity(conn, 'WAREHOUSE_RECEIPT', reservedReceiptNumber.toString());

            console.log("Created warehouse entity with ID:", entityId);

            const noteThreadId = await noteDB.createWarehouseNoteThread(conn, entityId, userId);

            // Build payload for new receipt (copy most fields from original)
            const newReceiptPayload: any = {
                receiptNumber: reservedReceiptNumber,
                receiptDate: originalReceipt.receiptDate,
                receivedBy: originalReceipt.receivedBy,
                location: originalReceipt.location,
                labelCount: originalReceipt.labelCount ?? 0,
                shipper: originalReceipt.shipper ?? '',
                customerId: Number(originalReceipt.customerId),
                stationId: Number(originalReceipt.stationId),
                verificationId: originalReceipt.verificationId ?? null,
                createdBy: userId,
                createdAt: originalReceipt.createdAt,
                carrierId: Number(originalReceipt.carrierId),
                piecesInland: originalReceipt.piecesInland != null ? Number(originalReceipt.piecesInland) : 0,
                weightInland: originalReceipt.weightInland != null ? Number(originalReceipt.weightInland) : 0,
                cubicMeter: originalReceipt.cubicMeter ?? null,
                reWeight: originalReceipt.reWeight ?? null,
                proNumber: originalReceipt.proNumber ?? null,
                status: 'PREPARED',
                entityId: entityId ?? null,
                noteThreadId: noteThreadId ?? null,
                invoiceNumber: originalReceipt.invoiceNumber ?? null,
                poNumber: originalReceipt.poNumber ?? null,
                customerRefNumber: originalReceipt.customerRefNumber ?? null,
                destination: originalReceipt.destination ?? null,
                packageId: originalReceipt.packageId ?? null,
                bandedSkid: originalReceipt.bandedSkid ?? 'N',
                shrinkWrappedSkid: originalReceipt.shrinkWrappedSkid ?? 'N',
                shtIppcSkid: originalReceipt.shtIppcSkid ?? 'N',
                plasticSkid: originalReceipt.plasticSkid ?? 'N',
                freightCondition: originalReceipt.freightCondition ?? 'N',
                documents: originalReceipt.documents ?? 'N',
                handlingDescription: originalReceipt.handlingDescription ?? null,
                hazMat: originalReceipt.hazMat ?? 'N',
                originalDgd: originalReceipt.originalDgd ?? 'N',
                unNumber: originalReceipt.unNumber ?? null,
                class: originalReceipt.class ?? null,
                properShippingName: originalReceipt.properShippingName ?? null,
                hazardousDescription: originalReceipt.hazardousDescription ?? null,
                receiptType: originalReceipt.receiptType ?? 'Regular',
                notes: originalReceipt.notes ?? null,
                accountOnHold: originalReceipt.accountOnHold ?? 'N',
                sendToTellSystem: originalReceipt.sendToTellSystem ?? 'N',
                hasFlatRate: originalReceipt.hasFlatRate ?? 'N',
            };

            const newReceiptId = await warehouseReceiptDB.createWarehouseReceipt(conn, newReceiptPayload);



            console.log(`Split receipt ${receiptId} into new receipt ${newReceiptId} (number ${reservedReceiptNumber})`);

            // Emit audit log for creation of the new (split) receipt
            try {
                emitAuditLog({
                    receiptNumber: reservedReceiptNumber,
                    receiptId: Number(newReceiptId),
                    proNumber: originalReceipt.proNumber || undefined,
                    userId,
                    status: 'PREPARED',
                    description: `Created by splitting receipt ${receiptId} (number ${originalReceipt.receiptNumber}). Reserved number ${reservedReceiptNumber}.`,
                    level: 'INFO'
                });
            } catch (err) {
                console.warn('Failed to emit audit log for new split receipt:', err);
            }

            // Move unscanned freight items to the new receipt
            for (const unf of unscannedItems) {
                const freightCreate = {
                    receiptId: newReceiptId,
                    pieces: unf.pieces ?? null,
                    type: (unf as any).type ?? null,
                    length: (unf as any).length ?? null,
                    width: (unf as any).width ?? null,
                    height: (unf as any).height ?? null,
                    weight: (unf as any).weight ?? null,
                    cubicMeter: (unf as any).cubicMeter ?? null,
                    freightBarcodeValue: (unf as any).freightBarcodeValue ?? null,
                };

                const createdFreightId = await warehouseReceiptDB.createFreightInfo(conn, freightCreate as any);

                // Move any freight images to the new freight record
                try {
                    const images = await warehouseReceiptDB.getFreightImages(conn, Number(unf.freightId));
                    for (const img of images) {
                        const path = (img as any).imagePath ?? (img as any).imageUrl ?? (img as any).filePath ?? null;
                        if (path) {
                            await warehouseReceiptDB.createFreightImage(conn, createdFreightId, path);
                        }
                    }

                    // Remove original freight images to avoid orphaned records after we delete the freight row
                    await warehouseReceiptDB.deleteFreightImagesByFreight(conn, Number(unf.freightId));
                } catch (err) {
                    // continue even if image migration fails for a specific item
                    console.warn(`Failed to migrate freight images for freightId ${unf.freightId}:`, err);
                }

                // Delete original freight info (we moved this item)
                await warehouseReceiptDB.deleteFreightInfo(conn, Number(unf.freightId));
            }

            // Recompute pieces/weight and cubic meter for original (scanned) and new receipt (unscanned)
            const remainingFreightForOriginal = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
            const newReceiptFreight = await warehouseReceiptDB.getFreightInfosByReceipt(conn, newReceiptId);

            const originalReWeight = remainingFreightForOriginal.reduce((sum, it) => sum + ((Number((it as any).pieces) || 0) * (Number((it as any).weight) || 0)), 0);
            const originalCubicMeter = remainingFreightForOriginal.reduce((sum, it) => sum + (Number((it as any).cubicMeter) || 0), 0);

            const newReWeight = newReceiptFreight.reduce((sum, it) => sum + ((Number((it as any).pieces) || 0) * (Number((it as any).weight) || 0)), 0);
            const newCubicMeter = newReceiptFreight.reduce((sum, it) => sum + (Number((it as any).cubicMeter) || 0), 0);

            const originalLabelCount = remainingFreightForOriginal.length;
            const newLabelCount = newReceiptFreight.length;

            // Update receipts with recalculated reWeight, cubicMeter, labelCount and statuses
            await warehouseReceiptDB.updateWarehouseReceipt(conn, receiptId, {
                reWeight: originalReWeight,
                cubicMeter: originalCubicMeter,
                labelCount: originalLabelCount,
                status: remainingFreightForOriginal.length > 0 && remainingFreightForOriginal.every(fi => String((fi as any).isScanned).toUpperCase() === 'Y') ? 'SCANNED' : 'PREPARED',
                updatedBy: userId,
            });

            // Emit audit log for original receipt after split
            try {
                emitAuditLog({
                    receiptNumber: originalReceipt.receiptNumber,
                    receiptId: Number(receiptId),
                    proNumber: originalReceipt.proNumber || undefined,
                    userId,
                    status: remainingFreightForOriginal.length > 0 && remainingFreightForOriginal.every(fi => String((fi as any).isScanned).toUpperCase() === 'Y') ? 'SCANNED' : 'PREPARED',
                    description: `Split: moved ${newLabelCount} freight items to receipt ${newReceiptId} (number ${reservedReceiptNumber}). reWeight ${originalReceipt.reWeight ?? 0} -> ${originalReWeight}. labelCount ${originalReceipt.labelCount ?? 0} -> ${originalLabelCount}`,
                    level: 'INFO'
                });
            } catch (err) {
                console.warn('Failed to emit audit log for original receipt after split:', err);
            }

            await warehouseReceiptDB.updateWarehouseReceipt(conn, newReceiptId, {
                reWeight: newReWeight,
                cubicMeter: newCubicMeter,
                labelCount: newLabelCount,
                status: newReceiptFreight.length > 0 && newReceiptFreight.every(fi => String((fi as any).isScanned).toUpperCase() === 'Y') ? 'SCANNED' : 'PREPARED',
                updatedBy: userId,
            });

            // Emit audit log for new receipt after freight migration
            try {
                emitAuditLog({
                    receiptNumber: reservedReceiptNumber,
                    receiptId: Number(newReceiptId),
                    proNumber: originalReceipt.proNumber || undefined,
                    userId,
                    status: newReceiptFreight.length > 0 && newReceiptFreight.every(fi => String((fi as any).isScanned).toUpperCase() === 'Y') ? 'SCANNED' : 'PREPARED',
                    description: `Split: received ${newLabelCount} freight items migrated from receipt ${receiptId}. reWeight set to ${newReWeight}. labelCount set to ${newLabelCount}`,
                    level: 'INFO'
                });
            } catch (err) {
                console.warn('Failed to emit audit log for new receipt after split:', err);
            }

            // Add the new receipt id to mapping so shipment includes it
            currentReceiptIds.push(Number(newReceiptId));
        }

        // Update shipment -> receipts mapping to include any newly created receipts
        const uniqueReceiptIds = Array.from(new Set(currentReceiptIds.map(id => Number(id))));
        await shipmentDB.replaceReceipts(conn, shipmentId, uniqueReceiptIds.map(id => ({ receiptId: id })));

        // After splitting receipts, mark the shipment as APPROVED
        await shipmentDB.approveShipmentCompletion(conn, shipmentId, userId, 'SPLIT_APPROVED');

        const updatedShipment = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return updatedShipment;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

export async function completeShipment(conn: Connection, shipmentId: number, userId: number) {
    const existingShipment = await shipmentDB.getShipmentById(conn, shipmentId);

    if (!existingShipment) {
        throwValidationError(`Shipment with id ${shipmentId} was not found.`);
    }

    try {
        await conn.beginTransaction();

        const shipmentReceipts = await shipmentDB.getReceiptsByShipmentId(conn, shipmentId);

        // find any receipt that is partially scanned (some items scanned and some not)
        const partiallyScannedReceipts: number[] = [];
        let aggregateTotal = 0;
        let aggregateScanned = 0;

        for (const receiptRef of shipmentReceipts) {
            const receiptId = Number((receiptRef as any).receiptId);
            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);

            const total = freightInfos.length;
            const scannedCount = freightInfos.filter(f => String((f as any).isScanned).toUpperCase() === 'Y').length;
            const unscannedCount = freightInfos.filter(f => String((f as any).isScanned).toUpperCase() !== 'Y').length;

            aggregateTotal += total;
            aggregateScanned += scannedCount;

            // partial means at least one scanned and at least one unscanned
            if (total > 0 && scannedCount > 0 && unscannedCount > 0) {
                partiallyScannedReceipts.push(receiptId);
            }
        }

        // Regardless of scan state (partial, fully scanned, or unscanned), mark completion as REQUESTED
        await shipmentDB.requestShipmentCompletion(conn, shipmentId, userId, 'REQUESTED');

        const updated = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return updated;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}