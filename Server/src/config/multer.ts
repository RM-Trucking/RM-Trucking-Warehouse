import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads', 'freight-images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-receiptnumber-freightindex-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only images are allowed. Got: ${file.mimetype}`));
    }
};

// Multer configuration
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 100 // Max 100 files per request
    }
});

/**
 * Get relative path for storing in database
 * Converts absolute path to relative path from project root
 */
export function getRelativeImagePath(absolutePath: string): string {
    return absolutePath.replace(process.cwd(), '').replace(/\\/g, '/').substring(1);
}

/**
 * Get absolute path from relative path
 */
export function getAbsoluteImagePath(relativePath: string): string {
    return path.join(process.cwd(), relativePath);
}

export default upload;
