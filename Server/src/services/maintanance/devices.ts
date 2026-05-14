import * as devicesDB from '../../database/maintanance';
import { Connection } from 'odbc';


interface CargoSpectreBase {
    code: string; // always exists
}

export interface CargoSpectreSuccess extends CargoSpectreBase {
    code: "0";
    Info: {
        Dimensions: {
            Length: number;
            Width: number;
            Height: number;
            Volume: number;
            Weight: {
                Net: number;
                Gross: number;
                Tare: number | null;
            };
            Density: number;
            Barcode: string;
        };
        Units: {
            Length: string;
            Volume: string;
            Weight: string;
            Density: string;
        };
        Scanner: {
            Mode: string;
            Certified: string;
        };
        Scale: {
            Certified: string;
        };
    };
}

export interface CargoSpectreError extends CargoSpectreBase {
    code: string; // e.g. "DIM_NO_OBJECT"
    description: string;
    value: string;
}

// Root type
export type CargoSpectreResponse =
    | { Responses: { Dimension: CargoSpectreSuccess } }
    | { Responses: { Dimension: CargoSpectreError } };




export async function getCargoAPIDropdown(
    conn: Connection
): Promise<{ apiId: number; apiName: string }[]> {
    try {
        const dropdownData = await devicesDB.getCargoAPIDropdown(conn);
        return dropdownData;
    } catch (error) {
        console.error('Error fetching Cargo API dropdown:', error);
        return [];
    }
}

export async function getDimentionsFromCargoAPI(
    conn: Connection,
    apiId: number
): Promise<CargoSpectreResponse | null> {
    try {
        const cargoAPI = await devicesDB.getCargoAPIById(conn, apiId);
        if (!cargoAPI) {
            return null;
        }

        console.log(cargoAPI);


        let result: CargoSpectreResponse = await fetch(
            cargoAPI.apiEndPoint,
            {
                method: 'GET',
                headers: {
                    'Accept': "application/json",
                    'Authorization': `Bearer ${cargoAPI.apiKey}`
                }
            }
        ).then(data => data.json())

        console.log('Cargo API response:', result);

        if (!result || !result.Responses || !result.Responses.Dimension) {
            console.error('Invalid response structure from Cargo API:', result);
            return null;
        }

        if (result.Responses.Dimension.code == "DIM_NO_OBJECT") {
            console.error('Error response from Cargo API:', result);
            return result; // Return the error response as is
        }

        return result;

    } catch (error) {
        console.error('Error fetching Cargo API dimensions:', error);
        return null;
    }
}


export async function getPrintersDropdown(
    conn: Connection
): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
    try {
        const dropdownData = await devicesDB.getPrintersDropdown(conn);
        return dropdownData;
    } catch (error) {
        console.error('Error fetching Printers dropdown:', error);
        return [];
    }
}