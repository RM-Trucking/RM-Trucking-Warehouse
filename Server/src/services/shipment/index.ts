import { Connection } from "odbc";
import * as shipmentDB from "../../database/shipment";
import { CreateWarehouseShipment, UpdateWarehouseShipment, WarehouseShipmentWithRelations } from "../../entities/shipment";

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

    try {
        await conn.beginTransaction();
        const shipmentId = await shipmentDB.createShipment(conn, normalizedPayload as any, userId);

        if (payload.containers !== undefined) {
            await shipmentDB.replaceContainers(conn, shipmentId, payload.containers ?? []);
        }
        if (payload.receipts !== undefined) {
            await shipmentDB.replaceReceipts(conn, shipmentId, payload.receipts ?? []);
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

    try {
        await conn.beginTransaction();
        await shipmentDB.updateShipment(conn, shipmentId, normalizedPayload as any, userId);

        if (Object.prototype.hasOwnProperty.call(payload, "containers")) {
            await shipmentDB.replaceContainers(conn, shipmentId, payload.containers ?? []);
        }

        if (Object.prototype.hasOwnProperty.call(payload, "receipts")) {
            await shipmentDB.replaceReceipts(conn, shipmentId, payload.receipts ?? []);
        }

        await conn.commit();

        const shipment = await getShipmentById(conn, shipmentId);
        if (!shipment) {
            throw new Error("Shipment could not be loaded after update");
        }

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
