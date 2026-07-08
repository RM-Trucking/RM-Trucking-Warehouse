// import * as devicesDB from '../../database/maintanance';
// import { Connection } from 'odbc';

// // Simple in-memory cache with TTL (5 minutes)
// const cache = new Map<string, { data: any; timestamp: number }>();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// const MAX_IMAGES = 5; // Limit images to reduce payload
// const MAX_IMAGE_SIZE = 500 * 1024; // 500KB per image
// const REQUEST_TIMEOUT = 10000; // 10 seconds timeout

// interface CargoSpectreBase {
//     code: string; // always exists
// }

// export interface CargoSpectreSuccess extends CargoSpectreBase {
//     Info: {
//         Dimensions: {
//             Length: number;
//             Width: number;
//             Height: number;
//             Volume: number;
//             Weight: {
//                 Net: number;
//                 Gross: number;
//                 Tare: number | null;
//             };
//             Density: number;
//             Barcode: string;
//         };
//         Units: {
//             Length: string;
//             Volume: string;
//             Weight: string;
//             Density: string;
//         };
//         Scanner: {
//             Mode: string;
//             Certified: string;
//         };
//         Scale: {
//             Certified: string;
//         };
//     };
// }

// export interface CargoSpectreError extends CargoSpectreBase {
//     code: string; // e.g. "DIM_NO_OBJECT"
//     description: string;
//     value: string;
// }

// export type CargoSpectreResponse =
//     | { Responses: { Dimension: CargoSpectreSuccess } }
//     | { Responses: { Dimension: CargoSpectreError } };

// export async function getCargoAPIDropdown(
//     conn: Connection
// ): Promise<{ apiId: number; apiName: string }[]> {
//     return await devicesDB.getCargoAPIDropdown(conn);
// }

// // Helper function to fetch with timeout
// function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT): Promise<Response> {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

//     return fetch(url, { ...options, signal: controller.signal })
//         .finally(() => clearTimeout(timeoutId));
// }

// export async function getDimentionsFromCargoAPI(
//     conn: Connection,
//     apiId: number
// ): Promise<any> {
//     // Check cache first
//     const cacheKey = `cargo-dimension-${apiId}`;
//     const cached = cache.get(cacheKey);
//     if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
//         console.log(`Cache hit for apiId: ${apiId}`);
//         return cached.data;
//     }

//     const cargoAPI = await devicesDB.getCargoAPIById(conn, apiId);
//     if (!cargoAPI) {
//         throw new Error('Cargo API not found');
//     }

//     const endpointParts = cargoAPI.apiEndPoint.split('/');
//     endpointParts.pop(); // Remove the last segment
//     const baseUrl = endpointParts.join('/');
//     const snapshotUrl = `${baseUrl}/snapshot`;

//     try {
//         // Helper to fetch file as base64 with size limits
//         async function fetchFileAsBase64(path: string): Promise<string> {
//             try {
//                 const fileUrl = `${baseUrl}/file/${path}`;
//                 const res = await fetchWithTimeout(fileUrl, {
//                     method: 'GET',
//                     headers: {
//                         'Authorization': `Bearer ${cargoAPI?.apiKey}`
//                     }
//                 });

//                 if (!res.ok) {
//                     console.warn(`Failed to fetch file ${path}: ${res.status}`);
//                     return '';
//                 }

//                 const buffer = await res.arrayBuffer();
//                 if (buffer.byteLength > MAX_IMAGE_SIZE) {
//                     console.warn(`Image ${path} exceeds max size, skipping`);
//                     return '';
//                 }

//                 return Buffer.from(buffer).toString('base64');
//             } catch (err) {
//                 console.error(`Error fetching file ${path}:`, err);
//                 return '';
//             }
//         }

//         // OPTIMIZATION 1: Parallelize dimension and snapshot calls
//         const [dimensionRes, snapshotRes] = await Promise.allSettled([
//             fetchWithTimeout(cargoAPI.apiEndPoint, {
//                 method: 'GET',
//                 headers: {
//                     'Accept': 'application/json',
//                     'Authorization': `Bearer ${cargoAPI.apiKey}`
//                 }
//             }),
//             fetchWithTimeout(snapshotUrl, {
//                 method: 'GET',
//                 headers: {
//                     'Accept': 'application/json',
//                     'Authorization': `Bearer ${cargoAPI.apiKey}`
//                 }
//             })
//         ]);

//         // Process dimension response
//         if (dimensionRes.status === 'rejected') {
//             throw new Error(`Cargo API Dimension request failed: ${dimensionRes.reason}`);
//         }

//         const dimensionResponse = dimensionRes.value;
//         if (!dimensionResponse.ok) {
//             throw new Error(`Cargo API Dimension request failed with status: ${dimensionResponse.status}`);
//         }

//         const result: any = await dimensionResponse.json();

//         if (!result?.Responses?.Dimension) {
//             throw new Error(`Invalid response structure from Cargo API: ${JSON.stringify(result)}`);
//         }

//         if (result.Responses.Dimension.code === 'DIM_NO_OBJECT') {
//             const errorResponse = {
//                 error: true,
//                 code: result.Responses.Dimension.code,
//                 message: result.Responses.Dimension.description || 'No object detected'
//             };
//             // Cache error responses for shorter duration
//             cache.set(cacheKey, { data: errorResponse, timestamp: Date.now() });
//             return errorResponse;
//         }

//         // OPTIMIZATION 2: Handle images with limits and early filtering
//         let imagesBase64: string[] = [];
//         if (snapshotRes.status === 'fulfilled' && snapshotRes.value.ok) {
//             const snapshot = await snapshotRes.value.json();
//             const imagesNode = snapshot?.Responses?.Snapshot?.Directory?.Images;
//             let imagePaths: string[] = [];

//             if (imagesNode?.Path) {
//                 imagePaths = Array.isArray(imagesNode.Path)
//                     ? imagesNode.Path
//                     : [imagesNode.Path];
//             }

//             // OPTIMIZATION 3: Limit number of images and fetch in parallel
//             imagePaths = imagePaths.slice(0, MAX_IMAGES);
//             const imageResults = await Promise.allSettled(
//                 imagePaths.map((path: string) => fetchFileAsBase64(path))
//             );

//             imagesBase64 = imageResults
//                 .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
//                 .map(result => result.value)
//                 .filter(img => img);
//         }

//         const response = {
//             length: result.Responses.Dimension.Info?.Dimensions?.Length || 0,
//             width: result.Responses.Dimension.Info?.Dimensions?.Width || 0,
//             height: result.Responses.Dimension.Info?.Dimensions?.Height || 0,
//             weight: result.Responses.Dimension.Info?.Dimensions?.Weight?.Net || 0,
//             images: imagesBase64
//         };

//         // OPTIMIZATION 4: Cache the successful response
//         cache.set(cacheKey, { data: response, timestamp: Date.now() });

//         return response;
//     } catch (error) {
//         console.error('Error in getDimentionsFromCargoAPI:', error);
//         throw error;
//     }
// }

// export async function getPrintersDropdown(
//     conn: Connection
// ): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
//     return await devicesDB.getPrintersDropdown(conn);
// }

// // Cache management function
// export function clearDimensionCache(apiId?: number): void {
//     if (apiId) {
//         cache.delete(`cargo-dimension-${apiId}`);
//     } else {
//         cache.clear();
//     }
// }


import * as devicesDB from '../../database/maintanance';
import { Connection } from 'odbc';
import { Buffer } from 'buffer';

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB per image
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout
const MAX_CONCURRENT_DOWNLOADS = 5; // limit simultaneous image fetches

// Filter patterns for relevant images
const RELEVANT_IMAGE_PATTERNS = [
    /Scale-\d+/i,  // Scale-1, Scale-2, etc.
    /-marked/i     // Any image ending with -marked (Femto-0-marked, etc.)
];

// Helper to check if image path is relevant
function isRelevantImage(imagePath: string): boolean {
    return RELEVANT_IMAGE_PATTERNS.some(pattern => pattern.test(imagePath));
}

// Helper function to fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
}

// Stream file download and convert to base64 progressively
async function fetchFileAsBase64(path: string, baseUrl: string, apiKey: string): Promise<string> {
    try {
        const fileUrl = `${baseUrl}/file/${path}`;
        const res = await fetch(fileUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept-Encoding': 'gzip, deflate'
            }
        });

        if (!res.ok || !res.body) {
            console.warn(`Failed to fetch file ${path}: ${res.status}`);
            return '';
        }

        const reader = res.body.getReader();
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            receivedLength += value.length;
            if (receivedLength > MAX_IMAGE_SIZE) {
                console.warn(`Image ${path} exceeds max size, skipping`);
                return '';
            }

            chunks.push(value);
        }

        const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
        return buffer.toString('base64');
    } catch (err) {
        console.error(`Error fetching file ${path}:`, err);
        return '';
    }
}

// Concurrency limiter without p-limit
async function fetchImagesWithLimit(paths: string[], baseUrl: string, apiKey: string): Promise<string[]> {
    const results: string[] = new Array(paths.length);

    // Process in batches to respect MAX_CONCURRENT_DOWNLOADS
    for (let i = 0; i < paths.length; i += MAX_CONCURRENT_DOWNLOADS) {
        const batch = paths.slice(i, i + MAX_CONCURRENT_DOWNLOADS);

        // Map each path to its index and fetch
        const promises = batch.map((path, idx) =>
            fetchFileAsBase64(path, baseUrl, apiKey).then(base64 => {
                results[i + idx] = base64 || '';
            })
        );

        await Promise.all(promises); // Wait for this batch to finish before moving on
    }

    return results;
}


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
    endpointParts.pop(); // Remove the last segment
    const baseUrl = endpointParts.join('/');
    const snapshotUrl = `${baseUrl}/snapshot`;

    try {
        const [dimensionRes, snapshotRes] = await Promise.allSettled([
            fetchWithTimeout(cargoAPI.apiEndPoint, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${cargoAPI.apiKey}`,
                    'Accept-Encoding': 'gzip, deflate'
                }
            }),
            fetchWithTimeout(snapshotUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${cargoAPI.apiKey}`,
                    'Accept-Encoding': 'gzip, deflate'
                }
            })
        ]);

        if (dimensionRes.status === 'rejected') {
            throw new Error(`Cargo API Dimension request failed: ${dimensionRes.reason}`);
        }

        const dimensionResponse = dimensionRes.value;
        if (!dimensionResponse.ok) {
            throw new Error(`Cargo API Dimension request failed with status: ${dimensionResponse.status}`);
        }

        const result: any = await dimensionResponse.json();

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

        let imagesBase64: string[] = [];
        if (snapshotRes.status === 'fulfilled' && snapshotRes.value.ok) {
            const snapshot = await snapshotRes.value.json();
            const imagesNode = snapshot?.Responses?.Snapshot?.Directory?.Images;
            let imagePaths: string[] = [];

            if (imagesNode?.Path) {
                imagePaths = Array.isArray(imagesNode.Path)
                    ? imagesNode.Path
                    : [imagesNode.Path];
            }

            const relevantImages = imagePaths.filter(isRelevantImage);
            console.log(`Filtered ${imagePaths.length} images down to ${relevantImages.length} relevant images`);

            imagesBase64 = await fetchImagesWithLimit(relevantImages, baseUrl, cargoAPI.apiKey);
        }

        return {
            length: result.Responses.Dimension.Info?.Dimensions?.Length || 0,
            width: result.Responses.Dimension.Info?.Dimensions?.Width || 0,
            height: result.Responses.Dimension.Info?.Dimensions?.Height || 0,
            weight: result.Responses.Dimension.Info?.Dimensions?.Weight?.Net || 0,
            images: imagesBase64
        };
    } catch (error) {
        console.error('Error in getDimentionsFromCargoAPI:', error);
        throw error;
    }
}

export async function getPrintersDropdown(
    conn: Connection
): Promise<{ printerId: number; printerName: string; printerIP: string; printerPort: number }[]> {
    return await devicesDB.getPrintersDropdown(conn);
}
