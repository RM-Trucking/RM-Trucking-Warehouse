export interface WarehouseShipment {
    shipmentId: number;
    shipmentType: "AIR" | "OCEAN_FCL" | "OCEAN_LCL";
    barcodeNumber: string;
    customerId: number;
    stationId: number;
    consigneeId: number;
    airBillNumber: string;
    booking: string;
    customerRefNumber: string;
    additionalRefNumber: string;
    pieces: number;
    weight: number;
    instructions: string;
    createdBy: number;
    createdAt: Date;
    updatedBy: number;
    updatedAt: Date;
    isCanceled: 'Y' | 'N';
    isShipped: 'Y' | 'N';
    isScanned: 'Y' | 'N';
    pickupEntry: 'Y' | 'N';
    pickupEntryNumber: string;
}

export interface WarehouseShipmentContainers {
    containerId?: number;
    shipmentId?: number;
    container: string;
}

export interface WarehouseShipmentReceipts {
    shipmentReceiptId?: number;
    shipmentId?: number;
    receiptId: number;
}

export type CreateWarehouseShipment = Omit<WarehouseShipment, 'shipmentId' | 'createdAt' | 'updatedAt' | 'isCanceled' | 'isShipped' | 'isScanned' | 'pickupEntry' | 'pickupEntryNumber'> & {
    containers?: Omit<WarehouseShipmentContainers, 'containerId' | 'shipmentId'>[];
    receipts?: Omit<WarehouseShipmentReceipts, 'shipmentReceiptId' | 'shipmentId'>[];
};

export type UpdateWarehouseShipment = Partial<Omit<WarehouseShipment, 'shipmentId' | 'createdAt' | 'updatedAt'>> & {
    shipmentId: number;
    containers?: Omit<WarehouseShipmentContainers, 'containerId' | 'shipmentId'>[];
    receipts?: Omit<WarehouseShipmentReceipts, 'shipmentReceiptId' | 'shipmentId'>[];
};

export interface WarehouseShipmentWithRelations extends WarehouseShipment {
    containers: WarehouseShipmentContainers[];
    receipts: WarehouseShipmentReceipts & {
        receiptNumber: string;
        status: string;
        piecesInland: number;
        weightInland: number;
        reWeight: number;
    }[];
}