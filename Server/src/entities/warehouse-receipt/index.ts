export interface WarehouseReceiptTemp {
    receiptNumber: number;
    verificationId: number;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    shipper?: string;
    customerId: number;
    stationId: number;
    carrierId: number;
    createdAt: Date;
    createdBy: number;
    status: string;
}

/**
 * Create interface for WarehouseReceiptTemp
 */
export interface CreateWarehouseReceiptTemp {
    verificationId: number;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    shipper?: string;
    customerId: number;
    stationId: number;
    carrierId: number;
    createdBy: number;
    status: string;
}

export interface WarehouseReceipt {
    receiptId: number;
    receiptNumber: number;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    labelCount?: number;
    shipper?: string;
    customerId: number;
    stationId: number;
    verificationId: number;
    createdAt: Date;
    createdBy: number;
    updatedAt?: Date;
    updatedBy?: number;
    carrierId: number;
    piecesInland?: number;
    weightInland?: number;
    reWeight?: number;
    proNumber?: string;
    invoiceNumber?: string;
    poNumber?: string;
    customerRefNumber?: string;
    withSkid?: boolean;
    bandedSkid?: boolean;
    shrinkWrappedSkid?: boolean;
    shtIppcSkid?: boolean;
    plasticSkid?: boolean;
    documentId?: number;
    freightCondition?: string;
    handlingDescription?: string;
    destination?: string;
    hazMat?: boolean;
    originalDgd?: string;
    unNumber?: string;
    class?: string;
    packageId?: string;
    properShippingName?: string;
    hazardousDescription?: string;
    status: string;
    noteThreadId?: number;
    entityId: number;
}

/**
 * Create interface for WarehouseReceipt
 */
export interface CreateWarehouseReceipt {
    receiptNumber: number;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    labelCount?: number;
    shipper?: string;
    customerId: number;
    stationId: number;
    verificationId: number;
    createdBy: number;
    carrierId: number;
    piecesInland?: number;
    weightInland?: number;
    reWeight?: number;
    proNumber?: string;
    invoiceNumber?: string;
    poNumber?: string;
    customerRefNumber?: string;
    withSkid?: boolean;
    bandedSkid?: boolean;
    shrinkWrappedSkid?: boolean;
    shtIppcSkid?: boolean;
    plasticSkid?: boolean;
    documentId?: number;
    freightCondition?: string;
    handlingDescription?: string;
    destination?: string;
    hazMat?: boolean;
    originalDgd?: string;
    unNumber?: string;
    class?: string;
    packageId?: string;
    properShippingName?: string;
    hazardousDescription?: string;
    status: string;
    noteThreadId?: number;
    entityId: number;
}

/**
 * Update interface for WarehouseReceipt
 */
export interface UpdateWarehouseReceipt {
    receiptId: number;
    location?: string;
    labelCount?: number;
    piecesInland?: number;
    weightInland?: number;
    reWeight?: number;
    status?: string;
    updatedBy?: number;
    updatedAt?: Date;
}

/**
 * Warehouse Receipt Freight Info
 */
export interface FreightInfo {
    freightId: number;
    receiptId: number;
    pieces: number;
    type: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    imageId?: number;
}

export interface CreateFreightInfo {
    receiptId: number;
    pieces: number;
    type: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    imageId?: number;
}

/**
 * Warehouse Receipt Audit Log
 */
export interface AuditLog {
    auditLogId: number;
    receiptNumber: number;
    receiptId: number;
    proNumber?: string;
    level?: string;
    eventTime: Date;
    userId: number;
    status: string;
    description?: string;
}

export interface CreateAuditLog {
    receiptNumber: number;
    receiptId: number;
    proNumber?: string;
    level?: string;
    userId: number;
    status: string;
    description?: string;
}

/**
 * Warehouse Receipt Rate
 */
export interface WarehouseReceiptRate {
    rateId: number;
    receiptId: number;
    rate: number;
    dimFactor?: number;
    baseRate?: number;
    minRate?: number;
    maxRate?: number;
}

export interface CreateWarehouseReceiptRate {
    receiptId: number;
    rate: number;
    dimFactor?: number;
    baseRate?: number;
    minRate?: number;
    maxRate?: number;
}
