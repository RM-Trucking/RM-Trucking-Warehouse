export interface Driver {
    driverId: number;
    driverName: string;
    driverSignature?: string;
}

/**
 * Create interface for Driver
 */
export interface CreateDriver {
    driverName: string;
    driverSignature?: string;
}

/**
 * Update interface for Driver
 */
export interface UpdateDriver {
    driverId: number;
    driverName?: string;
    driverSignature?: string;
}

export interface IDVerification {
    verificationId: number;
    carrierId: number;
    customerId: number;
    stationId: number;
    doorNo?: string;
    firstIdType: string;
    firstIdPhotoMatch: 'Y' | 'N';
    secondIdType?: string;
    secondIdPhotoMatch: 'Y' | 'N';
    driverId: number;
    verifiedByEmployee: string;
    createdAt: Date;
    createdBy: number;
    toEmails: string[];
   
}

/**
 * Create interface for IDVerification
 */
export interface CreateIDVerification {
    carrierId: number;
    customerId: number;
    stationId: number;
    doorNo?: string;
    firstIdType: string;
    firstIdPhotoMatch: boolean;
    secondIdType?: string;
    secondIdPhotoMatch: boolean;
    driverId: number;
    driverName: string;
    driverSignature: string;
    shipperCompanyName?: string;
    verifiedByEmployee: string;
    createdBy: number;
    toEmails?: string[] | string;
}

/**
 * Update interface for IDVerification
 */
export interface UpdateIDVerification {
    verificationId: number;
    carrierId?: number;
    doorNo?: string;
    firstIdType?: string;
    firstIdPhotoMatch?: boolean;
    secondIdType?: string;
    secondIdPhotoMatch?: boolean;
    driverId?: number;
    shipperCompanyName?: string;
    verifiedByEmployee?: string;
    updatedBy?: number;
}

export interface IDVerificationProDetail {
    proDetailId: number;
    verificationId: number;
    pieces: number;
    weight: number;
    shipper: string;
    proNumber: string;
}

/**
 * Create interface for ProDetail
 */
export interface CreateProDetail {
    verificationId: number;
    pieces: number;
    weight: number;
    shipper: string;
    proNumber: string;
}

/**
 * Freight detail input with grouping information (for service layer)
 */
export interface FreightDetailInput extends Omit<CreateProDetail, "verificationId"> {
    customerId: number;
    stationId: number;
    proDetailId?: number; // Optional, can be used for linking to enroute if needed
    toEmails?: string[];
}

/**
 * Update interface for ProDetail
 */
export interface UpdateProDetail {
    proDetailId: number;
    pieces?: number;
    weight?: number;
    shipper?: string;
}
