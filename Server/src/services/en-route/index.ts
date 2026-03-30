import { Connection } from "odbc"; // adjust to your DB library
import * as enrouteDB from "../../database/en-route";
import {
    CreateEnroutePayload,
    EnrouteWithPros,
    VerifyProResponse,
    EnrouteProDetail
} from "../../entities/en-route";

// 1. Create Enroute with multiple PROs (transactional)
export async function createEnrouteWithPros(
    conn: Connection,
    payload: CreateEnroutePayload
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
            payload.createdBy
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
export async function listEnroutes(conn: Connection): Promise<EnrouteWithPros[]> {
    try {
        const result = await enrouteDB.listEnroutes(conn);

        const grouped: Record<number, EnrouteWithPros> = {};
        for (const row of result) {
            if (!grouped[row.enrouteId]) {
                grouped[row.enrouteId] = {
                    enrouteId: row.enrouteId,
                    estimatedDate: row.estimatedDate,
                    shippedDate: row.shippedDate,
                    carrierName: row.carrierName,
                    customerName: row.customerName,
                    stationName: row.stationName,
                    pros: []
                };
            }
            if (row.proDetailId) {
                const pro: EnrouteProDetail = {
                    proDetailId: row.proDetailId,
                    enrouteId: row.enrouteId,
                    proNumber: row.proNumber,
                    pieces: row.pieces,
                    weight: row.weight,
                    shipper: row.shipper,
                    activeStatus: row.activeStatus
                };
                grouped[row.enrouteId].pros.push(pro);
            }
        }

        return Object.values(grouped);
    } catch (error) {
        throw error;
    }
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
        stationName: result.stationName
    };

    return response;
}

