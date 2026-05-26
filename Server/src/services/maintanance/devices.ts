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
    return await devicesDB.getCargoAPIDropdown(conn);
}

export async function getDimentionsFromCargoAPI(
    conn: Connection,
    apiId: number
): Promise<any> {
    const cargoAPI = await devicesDB.getCargoAPIById(conn, apiId);
    if (!cargoAPI) {
        throw new Error('Cargo API not found');
    }

    const endpointParts = cargoAPI.apiEndPoint.split('/');
    endpointParts.pop(); // Remove the last segment (assumed to be 'dimension')
    const baseUrl = endpointParts.join('/');
    const snapshotUrl = `${baseUrl}/snapshot`;

    // First API call: Dimensions
    const dimensionRes = await fetch(cargoAPI.apiEndPoint, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${cargoAPI.apiKey}`
        }
    });

    if (!dimensionRes.ok) {
        throw new Error(`Cargo API Dimension request failed with status: ${dimensionRes.status}`);
    }

    const result: any = await dimensionRes.json();

    if (!result?.Responses?.Dimension) {
        throw new Error(`Invalid response structure from Cargo API: ${JSON.stringify(result)}`);
    }

    if (result.Responses.Dimension.code === 'DIM_NO_OBJECT') {
        return {
            error: true,
            code: result.Responses.Dimension.code,
            message: result.Responses.Dimension.description || 'No object detected'
        };
    }

    // Second API call: Snapshot
    let snapshot: any = null;
    try {
        const snapshotRes = await fetch(snapshotUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${cargoAPI.apiKey}`
            }
        });

        if (snapshotRes.ok) {
            snapshot = await snapshotRes.json();
        } else {
            console.warn(`Cargo API Snapshot request failed with status: ${snapshotRes.status}`);
        }
    } catch (error) {
        console.error('Error fetching Cargo API Snapshot:', error);
    }

    // Helper to fetch file and convert to base64
    async function fetchFileAsBase64(path: string): Promise<string> {
        try {
            const fileUrl = `${baseUrl}/file/${path}`;
            const res = await fetch(fileUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cargoAPI?.apiKey}`
                }
            });
            if (!res.ok) {
                console.warn(`Failed to fetch file ${path}: ${res.status}`);
                return '';
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

    return {
        length: result.Responses.Dimension.Info?.Dimensions?.Length || 0,
        width: result.Responses.Dimension.Info?.Dimensions?.Width || 0,
        height: result.Responses.Dimension.Info?.Dimensions?.Height || 0,
        weight: result.Responses.Dimension.Info?.Dimensions?.Weight?.Net || 0,
        images: imagesBase64.filter(img => img) // drop failed fetches
    };
}

export async function getPrintersDropdown(
    conn: Connection
): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
    return await devicesDB.getPrintersDropdown(conn);
}
