// Enroute entity
export interface Enroute {
    enrouteId: number;
    carrierId: number;
    customerId: number;
    stationId: number;
    estimatedDate?: string | null;
    shippedDate?: string | null;
    createdAt: string;
    createdBy: string;
}

// PRO detail entity
export interface EnrouteProDetail {
    proDetailId: number;
    enrouteId: number;
    proNumber: string;
    pieces: number;
    weight: number;
    shipper: string;
    activeStatus: string; // 'Y' or 'N'
}

// Payload for creating enroute with multiple PROs
export interface CreateEnroutePayload {
    carrierId: number;
    customerId: number;
    stationId: number;
    estimatedDate?: string | null;
    shippedDate?: string | null;
    createdBy: string;
    toEmails?: string[];
    pros: CreateProPayload[];
}

// Payload for creating PROs
export interface CreateProPayload {
    proNumber: string;
    pieces: number;
    weight: number;
    shipper: string;
    activeStatus?: string;
}

// Response structure for grouped enroute with PROs
export interface EnrouteWithPros {
    enrouteId: number;
    estimatedDate?: string | null;
    shippedDate?: string | null;
    carrierName: string;
    customerName: string;
    stationName: string;
    createdAt: Date | null;
    createdByName: string;
    toEmails?: string;
    pros: EnrouteProDetail[];
}

// Verification response
export interface VerifyProResponse {
    proDetailId: number;
    proNumber: string;
    pieces: number;
    weight: number;
    shipper: string;
    activeStatus: string;
    enrouteId: number;
    carrierId: number;
    carrierName: string;
    customerId: number;
    customerName: string;
    stationId: number;
    stationName: string;
    toEmails?: string[];
}

// Comprehensive verification response (used by overall verify API)
export interface ComprehensiveVerifyResponse {
    isRejected?: boolean;
    source?: 'warehouse' | 'enroute';
    receiptId?: number;
    carrierId: number;
    carrierName: string;
    customerId: number;
    customerName: string;
    stationId: number;
    stationName: string;
    proNumber: string;
    pieces?: number;
    weight?: number;
    shipper?: string;
    piecesInland?: number;
    weightInland?: number;
    activeStatus?: string;
    proDetailId?: number;
    toEmails?: string[];
    message?: string;
}
