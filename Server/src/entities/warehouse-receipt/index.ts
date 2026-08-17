export interface WarehouseReceiptTemp {
    receiptNumber: number | bigint;
    verificationId: number | bigint;
    receiptDate: Date;
    receivedBy: string | null;
    location: string | null;
    shipper?: string;
    customerId: number;
    stationId: number;
    carrierId: number;
    createdAt: Date;
    createdBy: number;
    status: "INITIATED" | "ON_HAND" | "PREPARED" | "SCANNED" | "SHIPPED" | "REJECTED" | "ARCHIVED";
    destination?: string | null;
    proNumber?: string | null;
    packageId?: string | null;
    customerName?: string | null;
    stationName?: string | null;
    carrierName?: string | null;
}

/**
 * Create interface for WarehouseReceiptTemp
 */
export interface CreateWarehouseReceiptTemp {
    verificationId: number | bigint;
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
    receiptId: number | bigint;
    receiptNumber: number | bigint;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    labelCount?: number;
    shipper?: string;
    customerId: number;
    stationId: number;
    verificationId: number | bigint;
    createdAt: Date;
    createdBy: number;
    updatedAt?: Date;
    updatedBy?: number;
    carrierId: number;
    piecesInland?: number;
    weightInland?: number;
    cubicMeter?: number;
    reWeight?: number;
    proNumber?: string;
    invoiceNumber?: string;
    poNumber?: string;
    customerRefNumber?: string;
    bandedSkid?: 'Y' | 'N';
    shrinkWrappedSkid?: 'Y' | 'N';
    shtIppcSkid?: 'Y' | 'N';
    plasticSkid?: 'Y' | 'N';
    documents?: 'Y' | 'N';
    freightCondition?: 'Y' | 'N';
    handlingDescription?: string;
    destination?: string;
    hazMat?: 'Y' | 'N';
    originalDgd?: 'Y' | 'N';
    unNumber?: string[];
    class?: string[];
    packageId?: string;
    properShippingName?: string;
    hazardousDescription?: string;
    status: "INITIATED" | "ON_HAND" | "PREPARED" | "SCANNED" | "SHIPPED" | "REJECTED" | "ARCHIVED";
    noteThreadId?: number;
    entityId: number;
    toEmails?: string[];
    rejectionReason?: string;
    receiptType?: 'Regular' | 'Trailer';
    notes?: string;
    accountOnHold: 'Y' | 'N';
    sendToTellSystem: 'Y' | 'N';
    hasFlatRate: 'Y' | 'N';
    approvalStatus?: 'PENDING' | 'READY' | 'APPROVED';
    requestedBy?: number;
    requestedAt?: Date;
    approvedBy?: number;
    approvedAt?: Date;
}

/**
 * Create interface for WarehouseReceipt
 */
export interface CreateWarehouseReceipt {
    receiptNumber: number | bigint;
    receiptDate: Date;
    receivedBy: string;
    location: string;
    labelCount?: number;
    shipper?: string;
    customerId: number;
    stationId: number;
    verificationId: number | bigint;
    createdBy: number;
    carrierId: number;
    piecesInland?: number;
    weightInland?: number;
    cubicMeter?: number;
    reWeight?: number;
    proNumber?: string;
    invoiceNumber?: string;
    poNumber?: string;
    customerRefNumber?: string;
    bandedSkid?: 'Y' | 'N';
    shrinkWrappedSkid?: 'Y' | 'N';
    shtIppcSkid?: 'Y' | 'N';
    plasticSkid?: 'Y' | 'N';
    documentId?: number | bigint;
    freightCondition?: 'Y' | 'N';
    documents?: 'Y' | 'N';
    handlingDescription?: string;
    destination?: string;
    hazMat?: 'Y' | 'N';
    originalDgd?: 'Y' | 'N';
    unNumber?: string[];
    class?: string[];
    packageId?: string;
    properShippingName?: string;
    hazardousDescription?: string;
    status: "INITIATED" | "ON_HAND" | "PREPARED" | "SCANNED" | "SHIPPED" | "REJECTED" | "ARCHIVED";
    noteThreadId?: number;
    entityId: number;
    receiptType?: 'Regular' | 'Trailer';
    notes?: string;
    accountOnHold?: 'Y' | 'N';
    sendToTellSystem?: 'Y' | 'N';
    hasFlatRate?: 'Y' | 'N';
}

/**
 * Update interface for WarehouseReceipt
 */
export interface UpdateWarehouseReceipt {
    receiptId: number | bigint;
    location?: string;
    labelCount?: number;
    piecesInland?: number;
    weightInland?: number;
    cubicMeter?: number;
    reWeight?: number;
    status?: "INITIATED" | "ON_HAND" | "PREPARED" | "SCANNED" | "SHIPPED" | "REJECTED" | "ARCHIVED";
    updatedBy?: number;
    updatedAt?: Date;
}

/**
 * Warehouse Receipt Freight Info
 */
export interface FreightInfo {
    freightId: number | bigint;
    receiptId: number | bigint;
    freightBarcodeValue: string;
    pieces: number;
    type: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    cubicMeter?: number;
    isScanned: 'Y' | 'N';
}

export interface FreightInfoTemp {
    freightBarcodeId: number | bigint;
    freightBarcodeValue: string;
}

export interface CreateFreightInfo {
    receiptId: number | bigint;
    freightBarcodeValue: string;
    pieces: number;
    type: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    cubicMeter?: number;
}

/**
 * Warehouse Receipt Audit Log
 */
export interface AuditLog {
    auditLogId: number | bigint;
    receiptNumber: number | bigint;
    receiptId: number | bigint;
    proNumber?: string;
    level?: string;
    eventTime: Date;
    userId: number;
    status: string;
    description?: string;
}

export interface CreateAuditLog {
    receiptNumber: number | bigint;
    receiptId: number | bigint;
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
    rateId: number | bigint;
    receiptId: number | bigint;
    rate: number;        // required
    dimFactor: number;   // required
    baseRate: number;    // required
    minRate: number;     // required
    maxRate: number;     // required
}


export interface CreateWarehouseReceiptRate {
    receiptId: number | bigint;
    rate: number;
    dimFactor?: number;
    baseRate?: number;
    minRate?: number;
    maxRate?: number;
}

export interface WarehouseReceiptFreightImage {
    imageId: number | bigint;
    freightId: number | bigint;
    receiptId: number | bigint;
    imageUrl: string;
    uploadedAt: Date;
    uploadedBy: number;
}

export interface WarehouseReceiptDocuments {
    documentId: number | bigint;
    receiptId: number | bigint;
    filePath?: string;
    fileType?: string;
    uploadedAt?: Date;
    uploadedBy?: number;
}