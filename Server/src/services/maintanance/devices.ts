import * as devicesDB from '../../database/maintanance';
import { Connection } from 'odbc';

interface CargoSpectreBase {
    code: string; // always exists
}

export interface CargoSpectreSuccess extends CargoSpectreBase {
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

export type CargoSpectreResponse =
    | { Responses: { Dimension: CargoSpectreSuccess } }
    | { Responses: { Dimension: CargoSpectreError } };

export async function getCargoAPIDropdown(
    conn: Connection
): Promise<{ apiId: number; apiName: string }[]> {
    try {
        return await devicesDB.getCargoAPIDropdown(conn);
    } catch (error) {
        console.error('Error fetching Cargo API dropdown:', error);
        return [];
    }
}

export async function getDimentionsFromCargoAPI(
    conn: Connection,
    apiId: number
): Promise<any> {
    try {
        const cargoAPI = await devicesDB.getCargoAPIById(conn, apiId);
        if (!cargoAPI) return null;

        // First API call: Dimensions
        const result: any = await fetch(cargoAPI.apiEndPoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${cargoAPI?.apiKey}`
            }
        }).then(res => res.json());

        // Second API call: Snapshot
        const snapshot: any = await fetch(
            'https://proxy.spectre-licensing.com/api/Pallet%201/snapshot',
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${cargoAPI.apiKey}`
                }
            }
        ).then(res => res.json());

        if (!result?.Responses?.Dimension) {
            console.error('Invalid response structure from Cargo API:', result);
            return null;
        }

        if (result.Responses.Dimension.code === 'DIM_NO_OBJECT') {
            console.error('Error response from Cargo API:', result);
            return result;
        }

        // Helper to fetch file and convert to base64
        async function fetchFileAsBase64(path: string): Promise<string> {
            try {
                const fileUrl = `https://proxy.spectre-licensing.com/api/Pallet%201/file/${path}`;
                const res = await fetch(fileUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${cargoAPI?.apiKey}`
                    }
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch file ${path}: ${res.status}`);
                }
                const buffer = await res.arrayBuffer();
                return Buffer.from(buffer).toString('base64');
            } catch (err) {
                console.error(`Error fetching file ${path}:`, err);
                return '';
            }
        }

        // Normalize image paths
        const imagesNode = snapshot?.Responses?.Snapshot?.Directory?.Images;
        let imagePaths: string[] = [];
        if (imagesNode?.Path) {
            imagePaths = Array.isArray(imagesNode.Path)
                ? imagesNode.Path
                : [imagesNode.Path];
        }

        // Fetch all images in parallel
        const imagesBase64: string[] = await Promise.all(
            imagePaths.map((path: string) => fetchFileAsBase64(path))
        );

        const responseObj = {
            length: result.Responses.Dimension?.Info.Dimensions.Length,
            width: result.Responses.Dimension?.Info.Dimensions.Width,
            height: result.Responses.Dimension?.Info.Dimensions.Height,
            weight: result.Responses.Dimension?.Info.Dimensions.Weight.Net,
            images: imagesBase64.filter(img => img) // drop failed fetches
        };

        console.log('Final Cargo API response object:', responseObj);
        return responseObj;

    } catch (error) {
        console.error('Error fetching Cargo API dimensions:', error);
        return null;
    }
}

export async function getPrintersDropdown(
    conn: Connection
): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
    try {
        return await devicesDB.getPrintersDropdown(conn);
    } catch (error) {
        console.error('Error fetching Printers dropdown:', error);
        return [];
    }
}
