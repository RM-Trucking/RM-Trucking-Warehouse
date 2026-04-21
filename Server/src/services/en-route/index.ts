import { Connection } from "odbc"; // adjust to your DB library
import * as enrouteDB from "../../database/en-route";
import * as userDB from "../../database/maintanance/auth";
import {
    CreateEnroutePayload,
    EnrouteWithPros,
    VerifyProResponse,
    EnrouteProDetail
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

