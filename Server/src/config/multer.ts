import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { UPLOAD_PATHS, WAREHOUSE_IMAGE_CATEGORIES } from './env';

// Module and file type constants
export const UPLOAD_MODULES = {
    WAREHOUSE: 'warehouse',
};

export const FILE_TYPES = {
    IMAGES: 'images',
    DOCUMENTS: 'documents'
};

// File type MIME configurations
const MIME_TYPES = {
    [FILE_TYPES.IMAGES]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    [FILE_TYPES.DOCUMENTS]: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
};

// Upload limits
const LIMITS = {
    [FILE_TYPES.IMAGES]: { fileSize: 10 * 1024 * 1024, files: 100 },
    [FILE_TYPES.DOCUMENTS]: { fileSize: 50 * 1024 * 1024, files: 50 }
};

// Helper to ensure directory exists
export function ensureUploadDirExists(dirPath: string | undefined): string {
    if (!dirPath) {
        throw new Error('Upload path is not configured. Check your environment variables.');
    }

    // Expand ~ to user home
    let resolvedPath = dirPath;
    if (resolvedPath.startsWith('~')) {
        resolvedPath = path.join(os.homedir(), resolvedPath.slice(1));
    }

    // Resolve relative paths against working directory and normalize
    if (!path.isAbsolute(resolvedPath)) {
        resolvedPath = path.resolve(process.cwd(), resolvedPath);
    } else {
        resolvedPath = path.normalize(resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
    }

    return resolvedPath;
}


// Initialize all module directories from UPLOAD_PATHS (only when configured)
Object.entries(UPLOAD_PATHS).forEach(([module, config]) => {
    if (config && config.images) {
        try {
            ensureUploadDirExists(config.images);
        } catch (err: any) {
            console.warn(`Upload images path for module '${module}' could not be created: ${err.message}`);
        }
    } else {
        console.warn(`Upload images path for module '${module}' not configured`);
    }

    if (config && config.documents) {
        try {
            ensureUploadDirExists(config.documents);
        } catch (err: any) {
            console.warn(`Upload documents path for module '${module}' could not be created: ${err.message}`);
        }
    } else {
        console.warn(`Upload documents path for module '${module}' not configured`);
    }
});

// Initialize warehouse image categories (only when configured)
Object.values(WAREHOUSE_IMAGE_CATEGORIES).forEach((category: any) => {
    if (category && category.path) {
        try {
            ensureUploadDirExists(category.path);
        } catch (err: any) {
            console.warn(`Warehouse category path '${category.key}' could not be created: ${err.message}`);
        }
    } else {
        console.warn(`Warehouse category '${category && category.key}' has no path configured`);
    }
});

// Create file filter
function createFileFilter(fileType: string) {
    const allowedMimes = MIME_TYPES[fileType] || MIME_TYPES[FILE_TYPES.IMAGES];
    return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}. Got: ${file.mimetype}`));
        }
    };
}

// Factory function to create combined uploader for warehouse (both freight and bad freight)
export function createCombinedWarehouseImageUploader() {
    const storage = multer.diskStorage({
        destination: (req: any, file: Express.Multer.File, cb: any) => {
            // Determine which category based on field name
            let categoryPath = WAREHOUSE_IMAGE_CATEGORIES.FREIGHT.path;

            if (file.fieldname === 'badFreightImages' || file.fieldname === 'bad-freight-image' || file.fieldname.startsWith('bad-freight-image-')) {
                categoryPath = WAREHOUSE_IMAGE_CATEGORIES.BAD_FREIGHT.path;
            } else if (file.fieldname === 'freightImages' || file.fieldname === 'freight' || file.fieldname.startsWith('freight-')) {
                categoryPath = WAREHOUSE_IMAGE_CATEGORIES.FREIGHT.path;
            }

            // Get optional subfolder (like receipt ID, shipment ID, etc.)
            const subFolder = req.params.id || req.params.subFolder || req.query.subFolder || '';
            const uploadPath = subFolder ? `${categoryPath}/${subFolder}` : categoryPath;
            const fullPath = ensureUploadDirExists(uploadPath);
            cb(null, fullPath);
        },
        filename: (req: any, file: Express.Multer.File, cb: any) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext);
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        }
    });

    return multer({
        storage,
        fileFilter: createFileFilter(FILE_TYPES.IMAGES),
        limits: LIMITS[FILE_TYPES.IMAGES]
    });
}

// Factory function to create dynamic multer instance based on module and file type
export function createModuleUploader(module: string, fileType: string) {
    const moduleConfig: any = UPLOAD_PATHS[module as keyof typeof UPLOAD_PATHS];

    if (!moduleConfig) {
        throw new Error(`Module '${module}' not configured in UPLOAD_PATHS`);
    }

    const baseDir = moduleConfig[fileType];
    if (!baseDir) {
        throw new Error(`File type '${fileType}' not configured for module '${module}'`);
    }

    const storage = multer.diskStorage({
        destination: (req: any, file: Express.Multer.File, cb: any) => {
            // Get custom subfolder from request params/query if provided
            const subFolder = req.params.subFolder || req.query.subFolder || '';
            const uploadPath = subFolder ? `${baseDir}/${subFolder}` : baseDir;
            const fullPath = ensureUploadDirExists(uploadPath);
            cb(null, fullPath);
        },
        filename: (req: any, file: Express.Multer.File, cb: any) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext);
            cb(null, `${name}-${uniqueSuffix}${ext}`);
        }
    });

    return multer({
        storage,
        fileFilter: createFileFilter(fileType),
        limits: LIMITS[fileType] || LIMITS[FILE_TYPES.IMAGES]
    });
}

// Pre-created uploaders for warehouse with image categories
export const uploaders = {
    warehouse: {
        // Combined uploader for both freight and bad freight (use different field names)
        combinedImages: createCombinedWarehouseImageUploader(),

        // Image categories (single category)
        freightImages: createCombinedWarehouseImageUploader(),
        badFreightImages: createCombinedWarehouseImageUploader(),

    }
};

// Path utilities
export function getRelativePath(absolutePath: string): string {
    const normalized = path.normalize(absolutePath);
    const cwd = path.normalize(process.cwd());
    if (normalized.startsWith(cwd)) {
        return normalized.replace(cwd, '').replace(/\\/g, '/').replace(/^\/+/, '');
    }
    return normalized.replace(/\\/g, '/');
}

export function getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) return path.normalize(relativePath);
    return path.resolve(process.cwd(), relativePath);
}

// Backward compatibility

export const getRelativeImagePath = getRelativePath;
export const getAbsoluteImagePath = getAbsolutePath;

