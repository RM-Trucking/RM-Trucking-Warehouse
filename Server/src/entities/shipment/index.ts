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
    completeStatus: 'IDEAL' | 'REQUESTED' | 'SPLIT_APPROVED' | 'APPROVED';
    requestedBy: number;
    requestedAt: Date;
    approvedBy: number;
    approvedAt: Date;
    entityId: number;
    noteThreadId: number;
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

export interface WarehouseShipmentPickupEntry {
    pickupId: number;
    shipmentId: number;
    barcodeNumber: string;
    pickupDate: Date;
    contactName: string;
    contactPhoneNumber: string;
    customerId: number;
    customerName: string;
    stationId: number;
    stationName: string;
    billTo: string;
    stationAddressLine1: string;
    stationAddressLine2: string;
    stationCity: string;
    stationState: string;
    stationZipCode: string;
    stationPhoneNumber: string;
    airlineCode: string;
    airBillNumber: string;
    hazmat: 'Y' | 'N';
    pieces: number;
    weight: number;
    readyTime: string;
    readyDate: Date;
    closeTime: string;
    closeDate: Date;
    loTime: string;
    loDate: Date;
    createdBy: number;
    createdAt: Date;
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
        parentReceipt?: number | null;
        status: string;
        piecesInland: number;
        weightInland: number;
        reWeight: number;
    }[];
}

export interface ShipmentResposeForPickup {
    entryDetails: {
        shipmentId: number;
        barcodeNumber: string;
        shipmentType: "AIR" | "OCEAN_FCL" | "OCEAN_LCL";
        booking: string;
        customerRefNumber: string;
        additionalRefNumber: string;
    }
    customerDetails: {
        customerId: number;
        customerName: string;
        stationId: number;
        stationName: string;
        stationRMAccountNumber: string;
        stationAddressLine1: string;
        stationAddressLine2: string;
        stationCity: string;
        stationState: string;
        stationZipCode: string;
        stationPhoneNumber: string;
    }
    shipmentDetails: {
        consigneeId: number;
        airlineCode: string;
        airBillNumber: string;
        pieces: number;
        weight: number;
    }
}

export interface WarehouseShipmentPickupRequest {
    shipmentId: number;
    barcodeNumber: string;
    pickupDate: Date;
    contactName: string;
    contactPhoneNumber: string;
    customerId: number;
    customerName: string;
    stationId: number;
    stationName: string;
    billTo: string;
    stationAddressLine1: string;
    stationAddressLine2: string;
    stationCity: string;
    stationState: string;
    stationZipCode: string;
    stationPhoneNumber: string;
    airlineCode: string;
    airBillNumber: string;
    hazmat: 'Y' | 'N';
    pieces: number;
    weight: number;
    readyTime: string;
    readyDate: Date;
    closeTime: string;
    closeDate: Date;
    loTime: string;
    loDate: Date;
}