import { getRelativeImagePath } from "../../config/multer";

/**
 * Process batch data with uploaded images
 * Maps uploaded files to freight items based on field names
 * 
 * Expected file field names: freight-{receiptIndex}-{freightIndex}-{imageIndex}
 * Example: freight-0-1-0 means receipts[0].freightDetails[1].images[0]
 */
export function processUploadedImages(batchData: any, uploadedFiles: Express.Multer.File[]): any {
    const processedData = JSON.parse(JSON.stringify(batchData));

    // Create a map of file field names to file paths
    const fileMap: { [key: string]: string } = {};
    uploadedFiles.forEach(file => {
        if (file.filename) {

            console.log("Processing uploaded file:", file.fieldname, file.originalname);

            fileMap[file.fieldname] = getRelativeImagePath(file.path);
        }
    });

    // Map files back to freight items
    processedData.receipts?.forEach((item: any, receiptIndex: number) => {
        item.freightDetails?.forEach((freight: any, freightIndex: number) => {
            freight.images = [];

            // Find all images for this freight item
            let imageIndex = 0;
            // const fieldName = `freight-${receiptIndex}-${freightIndex}-${imageIndex}`;

            // while (fileMap[fieldName]) {
            //     freight.images.push(fileMap[fieldName]);
            //     imageIndex++;
            // }

            while (true) {
                const fieldName = `freight-${receiptIndex}-${freightIndex}-${imageIndex}`;
                if (!fileMap[fieldName]) break;

                freight.images.push(fileMap[fieldName]);
                imageIndex++;
            }


        });
    });

    return processedData;
}

/**
 * Validate batch data structure
 */
export function validateBatchData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.receipts || !Array.isArray(data.receipts)) {
        errors.push("receipts array is required");
        return { valid: false, errors };
    }

    if (data.receipts.length === 0) {
        errors.push("receipts array cannot be empty");
    }

    data.receipts.forEach((item: any, index: number) => {
        if (!item.receipt) {
            errors.push(`receipts[${index}].receipt is required`);
        }
        if (!Array.isArray(item.freightDetails)) {
            errors.push(`receipts[${index}].freightDetails must be an array`);
        }
        if (item.freightDetails?.length === 0) {
            errors.push(`receipts[${index}].freightDetails cannot be empty`);
        }

        item.freightDetails?.forEach((freight: any, fIndex: number) => {
            if (!freight.type) {
                errors.push(`receipts[${index}].freightDetails[${fIndex}].type is required`);
            }
            if (freight.pieces === undefined) {
                errors.push(`receipts[${index}].freightDetails[${fIndex}].pieces is required`);
            }
        });
    });

    return { valid: errors.length === 0, errors };
}
