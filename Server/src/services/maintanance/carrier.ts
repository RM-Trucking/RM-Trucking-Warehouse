import { Connection } from 'odbc';
import * as carrierDB from '../../database/maintanance';
import * as entityDB from '../../database/maintanance';
import * as noteDB from '../../database/maintanance';

import { CreateCarrierRequest } from '../../entities/maintanance/carrier';



export async function createNewCarrier(
    conn: Connection,
    createCarrierReq: CreateCarrierRequest,
    adminId: number
): Promise<{ carrier: { carrierId: number, carrierName: string } }> {
    const { carrierName, corporatePhoneNumber } = createCarrierReq;

    await conn.beginTransaction();
    try {

        const conflict = await carrierDB.checkCarrierUniqueFields(conn, {
            carrierName
        });
        if (conflict) {
            throw new Error(`${conflict} already exists. Please use a unique value.`);
        }

        // 1) Create Entity
        const entityId = await entityDB.createEntity(conn, "CARRIER", carrierName);

        // 2) Create Note Thread
        const noteThreadId = await noteDB.createNoteThread(conn, entityId, adminId);

        // 3) Insert Carrier
        const carrier = await carrierDB.createCarrierMinimal(conn, {
            carrierName,
            corporatePhoneNumber,
            createdBy: adminId,
            entityId,
            noteThreadId,

        });

        await conn.commit();

        return { carrier } as any

    } catch (err) {
        await conn.rollback();
        throw err;
    }
}


export async function listCarrierDropdownService(
    conn: Connection,
    searchTerm?: string
): Promise<{ carrierId: number; carrierName: string }[]> {
    return await carrierDB.listCarriers(conn, searchTerm);
}

export async function listParcelCarrierDropdownService(
    conn: Connection,
    searchTerm?: string
): Promise<{ carrierId: number; carrierName: string }[]> {
    return await carrierDB.listParcelCarriers(conn, searchTerm);
}
