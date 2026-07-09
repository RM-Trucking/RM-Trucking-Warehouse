import { Connection } from "odbc"; // adjust to your DB library
import * as enrouteDB from "../../database/en-route";
import * as warehouseReceiptDB from "../../database/warehouse-receipt";
import * as userDB from "../../database/maintanance/auth";
import * as customerDB from "../../database/maintanance/customer";
import {
    CreateEnroutePayload,
    EnrouteWithPros,
    VerifyProResponse,
    EnrouteProDetail,
    ComprehensiveVerifyResponse
} from "../../entities/en-route";
import { toUtcDate } from "../../utils/dateFormater";

// 1. Create Enroute with multiple PROs (transactional)
export async function createEnrouteWithPros(
    conn: Connection,
    payload: CreateEnroutePayload,
    userId: number
): Promise<number> {
    try {
        await conn.beginTransaction();

        // Validate: Check if any PRO already exists for this carrier (regardless of status)
        for (const pro of payload.pros) {
            const existingPro = await enrouteDB.checkProExists(
                conn,
                payload.carrierId,
                pro.proNumber
            );

            if (existingPro) {
                throw new Error(
                    `PRO number ${pro.proNumber} is already added for carrier. Cannot create duplicate.`
                );
            }
        }

        // Create enroute record
        const enrouteId = await enrouteDB.createEnroute(
            conn,
            payload.carrierId,
            payload.customerId,
            payload.stationId,
            payload.estimatedDate || null,
            payload.shippedDate || null,
            payload.toEmails ? JSON.stringify(payload.toEmails) : null,
            userId
        );

        // Insert PRO details
        await enrouteDB.addProDetails(conn, enrouteId, payload.pros);

        await conn.commit();
        return enrouteId;
    } catch (error) {
        await conn.rollback();
        throw error;
    }
}

// 2. List all Enroutes with PROs grouped
export async function listEnroutes(
    conn: Connection,
    filters: { searchTerm?: string; page?: number; pageSize?: number }
): Promise<{ data: EnrouteWithPros[]; total: number; page: number; pageSize: number }> {
    const { searchTerm, page = 1, pageSize = 10 } = filters;

    // Step 1: get paginated enroute headers (no pros)
    const enroutes = await enrouteDB.listEnroutes(conn, { searchTerm, page, pageSize });
    const total = await enrouteDB.countEnroutes(conn, { searchTerm });

    const data: EnrouteWithPros[] = [];

    // Step 2: for each enroute, fetch its pros separately
    for (const e of enroutes) {
        const pros = await enrouteDB.getProsByEnrouteId(conn, e.enrouteId);

        data.push({
            enrouteId: e.enrouteId,
            estimatedDate: e.estimatedDate,
            shippedDate: e.shippedDate,
            carrierName: e.carrierName,
            customerName: e.customerName,
            stationName: e.stationName,
            createdAt: e.createdAt ? toUtcDate(e.createdAt) : null,
            createdByName: await userDB.getUserName(conn, e.createdBy),
            toEmails: e.toEmails ? JSON.parse(e.toEmails) : [],
            pros
        });
    }

    return { data, total, page, pageSize };
}




// 3. Verify PRO by carrier + proNumber
export async function verifyPro(
    conn: Connection,
    carrierId: number,
    proNumber: string
): Promise<VerifyProResponse | null> {
    const result = await enrouteDB.verifyPro(conn, carrierId, proNumber);
    if (!result) return null;

    const response: VerifyProResponse = {
        proDetailId: result.proDetailId,
        proNumber: result.proNumber,
        pieces: result.pieces,
        weight: result.weight,
        shipper: result.shipper,
        activeStatus: result.activeStatus,
        enrouteId: result.enrouteId,
        carrierId: result.carrierId,
        carrierName: result.carrierName,
        customerId: result.customerId,
        customerName: result.customerName,
        stationId: result.stationId,
        stationName: result.stationName,
        toEmails: result.toEmails ? JSON.parse(result.toEmails) : []
    };

    return response;
}

/**
 * COMPREHENSIVE VERIFY PRO - Check Warehouse Receipt first, then En-Route
 * Flow:
 * 1. Check Warehouse_Receipt (best source of truth for completed receipts)
 *    - If REJECTED status: return isRejected=true with details for potential reuse
 *    - If other status: return error "Record already exists"
 * 2. If no Warehouse_Receipt found, check En_Route table
 *    - If found: return en_route data
 *    - If not found: return message "No record found"
 */
export async function comprehensiveVerifyPro(
    conn: Connection,
    carrierId: number,
    proNumber: string
): Promise<ComprehensiveVerifyResponse> {
    // Step 1: Check Warehouse_Receipt first
    const warehouseRecord = await warehouseReceiptDB.getWarehouseReceiptByCarrierAndPro(conn, carrierId, proNumber);

    if (warehouseRecord) {
        // Fetch emails only after confirming record exists
        const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, warehouseRecord.stationId);
        const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, warehouseRecord.stationId);

        // Return warehouse record details with status check
        if (warehouseRecord.status === 'REJECTED') {
            // Allow reuse of rejected records
            return {
                isRejected: true,
                source: 'warehouse',
                receiptId: warehouseRecord.receiptId,
                carrierId: warehouseRecord.carrierId,
                carrierName: warehouseRecord.carrierName,
                customerId: warehouseRecord.customerId,
                customerName: warehouseRecord.customerName,
                stationId: warehouseRecord.stationId,
                stationName: warehouseRecord.stationName,
                proNumber: warehouseRecord.proNumber,
                pieces: warehouseRecord.piecesInland,
                weight: warehouseRecord.weightInland,
                shipper: warehouseRecord.shipper,
                toEmails: warehouseRecord.toEmails ? JSON.parse(warehouseRecord.toEmails) : [],
                customerEmails: emails,
                stationDefaultEmails: stationDefaultEmails
            };
        } else {
            // Record exists but not rejected
            throw new Error(
                `Record already exists for this carrier. PRO number with status ${warehouseRecord.status}. Cannot create duplicate unless status is REJECTED.`
            );
        }
    }

    // Step 2: If no warehouse record, check En_Route
    const enrouteRecord = await enrouteDB.verifyPro(conn, carrierId, proNumber);

    if (enrouteRecord) {
        // Fetch emails only after confirming record exists
        const emails = await customerDB.getDepartmentAndPersonnelEmails(conn, enrouteRecord.stationId);

        const stationDefaultEmails = await customerDB.getStationDefaultEmails(conn, enrouteRecord.stationId);

        // Return en_route data
        return {
            isRejected: false,
            source: 'enroute',
            carrierId: enrouteRecord.carrierId,
            carrierName: enrouteRecord.carrierName,
            customerId: enrouteRecord.customerId,
            customerName: enrouteRecord.customerName,
            stationId: enrouteRecord.stationId,
            stationName: enrouteRecord.stationName,
            proNumber: enrouteRecord.proNumber,
            pieces: enrouteRecord.pieces,
            weight: enrouteRecord.weight,
            shipper: enrouteRecord.shipper,
            activeStatus: enrouteRecord.activeStatus,
            proDetailId: enrouteRecord.proDetailId,
            toEmails: enrouteRecord.toEmails ? JSON.parse(enrouteRecord.toEmails) : [],
            customerEmails: emails,
            stationDefaultEmails: stationDefaultEmails
        };
    }

    // Step 3: No record found anywhere
    throw new Error(`No record found`);
}

