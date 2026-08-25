import * as devicesDB from '../../database/maintanance';
import { Connection } from 'odbc';
import { Buffer } from 'buffer';

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB per image
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout
const MAX_CONCURRENT_DOWNLOADS = 10; // limit simultaneous image fetches

// Filter patterns for relevant images
const RELEVANT_IMAGE_PATTERNS = [
    /x-\d+/i,  // Scale-1, Scale-2, etc.
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
    const active: Promise<void>[] = [];
    let nextIndex = 0;

    const enqueue = () => {
        while (active.length < MAX_CONCURRENT_DOWNLOADS && nextIndex < paths.length) {
            const currentIndex = nextIndex++;
            const path = paths[currentIndex];

            const promise = fetchFileAsBase64(path, baseUrl, apiKey)
                .then(base64 => {
                    results[currentIndex] = base64 || '';
                })
                .finally(() => {
                    const idx = active.indexOf(promise);
                    if (idx !== -1) {
                        active.splice(idx, 1);
                    }
                });

            active.push(promise);
        }
    };

    enqueue();

    while (active.length > 0) {
        await Promise.race(active);
        enqueue();
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

    const baseUrl = cargoAPI.apiEndPoint.replace(/\/+$/, '');
    const dimensionSnapshotUrl = `${baseUrl}/${encodeURIComponent('dimension snapshot')}`;

    try {
        const dimensionResponse = await fetchWithTimeout(dimensionSnapshotUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${cargoAPI.apiKey}`,
                'Accept-Encoding': 'gzip, deflate'
            }
        });

        if (!dimensionResponse.ok) {
            throw new Error(`Cargo API request failed with status: ${dimensionResponse.status}`);
        }

        const result: any = await dimensionResponse.json();
        const dimensionNode = result?.Responses?.Dimension;
        const snapshotNode = result?.Responses?.Snapshot;

        if (!dimensionNode) {
            throw new Error(`Invalid response structure from Cargo API: ${JSON.stringify(result)}`);
        }

        if (dimensionNode.code === 'DIM_NO_OBJECT') {
            return {
                error: true,
                code: dimensionNode.code,
                message: dimensionNode.description || 'No object detected'
            };
        }

        const imagesNode = snapshotNode?.Directory?.Images;
        let imagePaths: string[] = [];

        if (imagesNode?.Path) {
            imagePaths = Array.isArray(imagesNode.Path)
                ? imagesNode.Path
                : [imagesNode.Path];
        }

        const relevantImages = imagePaths.filter(isRelevantImage);
        console.log(`Filtered ${imagePaths.length} images down to ${relevantImages.length} relevant images`);

        const imagesBase64 = await fetchImagesWithLimit(relevantImages, baseUrl, cargoAPI.apiKey);

        return {
            length: dimensionNode.Info?.Dimensions?.Length || 0,
            width: dimensionNode.Info?.Dimensions?.Width || 0,
            height: dimensionNode.Info?.Dimensions?.Height || 0,
            weight: dimensionNode.Info?.Dimensions?.Weight?.Net || 0,
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
