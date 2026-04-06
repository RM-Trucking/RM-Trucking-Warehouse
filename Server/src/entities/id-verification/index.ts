export interface Driver {
    driverId: number;
    driverName: string;
    signaturePath?: string;
}

/**
 * Create interface for Driver
 */
export interface CreateDriver {
    driverName: string;
    signaturePath?: string;
}

/**
 * Update interface for Driver
 */
export interface UpdateDriver {
    driverId: number;
    driverName?: string;
    signaturePath?: string;
}

export interface IDVerification {
    verificationId: number;
    carrierId: number;
    doorNo?: string;
    firstIdType: string;
    firstIdPhotoMatch: 'Y' | 'N';
    secondIdType?: string;
    secondIdPhotoMatch: 'Y' | 'N';
    driverId: number;
    shipperCompanyName?: string;
    verifiedByEmployee: string;
    createdAt: Date;
    createdBy: number;
}

/**
 * Create interface for IDVerification
 */
export interface CreateIDVerification {
    carrierId: number;
    doorNo?: string;
    firstIdType: string;
    firstIdPhotoMatch: boolean;
    secondIdType?: string;
    secondIdPhotoMatch: boolean;
    driverId: number;
    shipperCompanyName?: string;
    verifiedByEmployee: string;
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
    customerId: number;
    stationId: number;
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
    customerId: number;
    stationId: number;
    pieces: number;
    weight: number;
    shipper: string;
    proNumber: string;
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
