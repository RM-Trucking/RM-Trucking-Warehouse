import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// FTP/CSV folder path for PRO details
const PRO_DETAIL_PATH = process.env.PRO_DETAIL_PATH || './uploads/pro-details';

export interface ProCsvData {
    proNumber: string;
    driverNumber: string;
    shipperAccountNumber: string;
    shipperName: string;
    fwdrAccountNumber: string;
    fwdrName: string;
    fwdrRef?: string;
    pieces: number;
    weight: number;
    carrierName: string;
    destCity?: string;
    hazmat?: string;
    proDate?: string;
}

/**
 * Parse CSV content and convert to records
 * Handles header mapping and field extraction
 */
export async function readCsvContent(filePath: string): Promise<ProCsvData[]> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return resolve([]);
        }

        const results: ProCsvData[] = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => {
                results.push({
                    proNumber: row.proNumber || '',
                    driverNumber: row.driverNumber || '',
                    shipperAccountNumber: row.shipperAccountNumber || '',
                    shipperName: row.shipperName || '',
                    fwdrAccountNumber: (row.fwdrAccountNumber || '').trim(),
                    fwdrName: row.fwdrName || '',
                    fwdrRef: row.fwdrRef || '',
                    pieces: parseInt(row.pieces || '0', 10),
                    weight: parseInt(row.weight || '0', 10),
                    carrierName: row.carrierName || '',
                    destCity: row.destCity || '',
                    hazmat: row.hazmat || 'N',
                    proDate: row.proDate || new Date().toISOString().split('T')[0],
                });
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

/**
 * Find CSV file matching PRO number
 * Convention: [prefix]_[proNumber]_[suffix].csv
 */
export async function findProCsvFile(proNumber: string): Promise<string | null> {
    try {
        console.log(`Looking for CSV file for PRO ${proNumber} in ${PRO_DETAIL_PATH}`);

        if (!fs.existsSync(PRO_DETAIL_PATH)) {
            console.log(`Directory does not exist: ${PRO_DETAIL_PATH}`);
            return null;
        }

        const files = await fs.promises.readdir(PRO_DETAIL_PATH);
        console.log(`Files found in directory: ${files.join(', ')}`);

        const matchingFiles = files.filter((file) => proNumber === file.split('_')[1]);

        console.log(`Matching files for PRO ${proNumber}: ${matchingFiles.join(', ')}`);

        if (matchingFiles.length > 1) {
            throw new Error(`Error: Multiple files found.`);
        }

        if (matchingFiles.length === 0) {
            return null;
        }

        return path.join(PRO_DETAIL_PATH, matchingFiles[0]);
    } catch (error) {
        if ((error as any).code === 'ENOENT') {
            return null; // Directory doesn't exist
        }
        throw error;
    }
}

/**
 * Get PRO detail from CSV file
 * Validates and returns single record from CSV
 */
export async function getProDetailFromCsv(proNumber: string): Promise<ProCsvData | null> {
    try {
        console.log(`Getting PRO details from CSV for PRO ${proNumber}`);

        const filePath = await findProCsvFile(proNumber);

        if (!filePath) {
            throw new Error(`Error: No file found.`);
        }

        const fileOutput = await readCsvContent(filePath);

        console.log(fileOutput);

        // Validate file has data
        if (!fileOutput.length) {
            throw new Error(`Error: No data found in CSV file.`);
        }

        if (fileOutput.length > 1) {
            throw new Error(`Error: Excessive data found in CSV file.`);
        }

        return fileOutput[0];
    } catch (error) {
        throw error;
    }
}

/**
 * Validate PRO CSV data for required fields
 */
export function validateProCsvData(data: ProCsvData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate Pro Number
    if (!data.proNumber) {
        errors.push(`Error: Missing Pro Number in CSV file.`);
    }

    // Validate Driver Number
    if (!data.driverNumber) {
        errors.push(`Error: Missing Driver Number in CSV file.`);
    }

    // Validate Shipper Account Number
    if (!data.shipperAccountNumber) {
        errors.push(`Error: Missing Shipper Account Number in CSV file.`);
    }

    // Validate Shipper Name
    if (!data.shipperName) {
        errors.push(`Error: Missing Shipper Name in CSV file.`);
    }

    // Validate Freight Forwarder Account Number
    if (!data.fwdrAccountNumber) {
        errors.push(`Error: Missing Freight Forwarder Account Number in CSV file.`);
    }

    // Validate Freight Forwarder Name
    if (!data.fwdrName) {
        errors.push(`Error: Missing Freight Forwarder Name in CSV file.`);
    }

    // Validate Carrier Name
    if (!data.carrierName) {
        errors.push(`Error: Missing Carrier Name in CSV file.`);
    }

    // Validate Pieces
    if (!data.pieces) {
        errors.push(`Error: Missing Pieces count in CSV file.`);
    } else if (Number.isNaN(data.pieces)) {
        errors.push(`Error: Invalid Pieces value in CSV file.`);
    }

    // Validate Weight
    if (!data.weight) {
        errors.push(`Error: Missing Weight in CSV file.`);
    } else if (Number.isNaN(data.weight)) {
        errors.push(`Error: Invalid Weight value in CSV file.`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
