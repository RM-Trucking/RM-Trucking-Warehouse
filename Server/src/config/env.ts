import { config } from 'dotenv';
config();

// Module upload paths - configurable via .env
export const UPLOAD_PATHS: Record<string, { images?: string; documents?: string }> = {
    warehouse: {
        images: process.env.WAREHOUSE_IMAGE_PATH,
        documents: process.env.WAREHOUSE_DOC_PATH
    },
    shipment: {
        images: process.env.SHIPMENT_IMAGE_PATH
    }
};

// Image categories for warehouse module - different storage paths based on image type
export const WAREHOUSE_IMAGE_CATEGORIES = {
    FREIGHT: {
        key: 'freight',
        path: process.env.FREIGHT_IMAGE_PATH,
        label: 'Freight Images'
    },
    BAD_FREIGHT: {
        key: 'bad-freight-image',
        path: process.env.BAD_FREIGHT_IMAGE_PATH,
        label: 'Bad Freight Images'
    }
};

