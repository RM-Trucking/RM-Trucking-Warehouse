import { Connection } from "odbc";
import * as shipmentDB from "../../database/shipment";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
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
    filters: { searchTerm?: string; page?: number; pageSize?: number }
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

        const notFullyScanned: number[] = [];

        for (const receipt of shipmentReceipts) {
            const receiptId = Number((receipt as any).receiptId);
            const freightInfos = await warehouseReceiptDB.getFreightInfosByReceipt(conn, receiptId);
            if (!hasAllFreightScanned(freightInfos)) {
                notFullyScanned.push(receiptId);
            }
        }

        if (notFullyScanned.length > 0) {
            throwValidationError(`All warehouse receipts must be fully scanned before sign-off. Unscanned receipts: ${notFullyScanned.join(", ")}`);
        }

        await shipmentDB.updateShipment(conn, shipmentId, { isShipped: "Y" }, userId);

        const record = await getShipmentById(conn, shipmentId);

        await conn.commit();

        return record;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}