import { z } from 'zod';

/**
 * ID Verification Validation Schemas using Zod
 */

// Driver Creation Schema
export const CreateDriverSchema = z.object({
    driverName: z.string().min(1, 'Driver name is required').trim(),
    driverSignature: z.string().optional()
}).strict();

// Freight Detail Input Schema
export const FreightDetailInputSchema = z.object({
    customerId: z.number().int().positive('Customer ID is required and must be positive'),
    stationId: z.number().int().positive('Station ID is required and must be positive'),
    proDetailId: z.number().int().positive('PRO Detail ID must be positive').optional(),
    proNumber: z.string().min(1, 'PRO number is required').trim(),
    pieces: z.number().positive('Pieces must be positive'),
    weight: z.number().positive('Weight must be positive'),
    shipper: z.string().min(1, 'Shipper is required').trim(),
    toEmails: z.array(z.string().email('Invalid email format')).optional()
}).strict();

// Create ID Verification Header Schema
export const CreateIDVerificationSchema = z.object({
    carrierId: z.number().int().positive('Carrier ID is required and must be positive'),
    customerId: z.number().int().positive('Customer ID is required and must be positive'),
    stationId: z.number().int().positive('Station ID is required and must be positive'),
    doorNo: z.string().optional(),
    firstIdType: z.string().min(1, 'First ID type is required'),
    firstIdPhotoMatch: z.boolean().default(false),
    secondIdType: z.string().optional(),
    secondIdPhotoMatch: z.boolean().default(false),
    driverId: z.number().int().positive('Driver ID must be positive').optional(),
    driverName: z.string().min(1, 'Driver name is required').trim(),
    driverSignature: z.string().min(1, 'Driver signature is required'),
    shipperCompanyName: z.string().optional(),
    verifiedByEmployee: z.string().min(1, 'Verified by employee is required'),
    toEmails: z.union([
        z.array(z.string().email('Invalid email format')),
        z.string().transform(v => {
            try {
                return JSON.parse(v);
            } catch {
                return v.split(',').map((e: string) => e.trim());
            }
        })
    ]).optional()
}).strict();

// Create Verification Payload (Header + Freight Details)
export const CreateVerificationPayloadSchema = z.object({
    header: CreateIDVerificationSchema,
    freightDetails: z.array(FreightDetailInputSchema)
        .min(1, 'At least one freight detail is required')
        .max(100, 'Maximum 100 freight details allowed')
}).strict();

// Update Driver Schema
export const UpdateDriverSchema = z.object({
    driverId: z.number().int().positive('Driver ID is required'),
    driverName: z.string().min(1, 'Driver name is required').trim().optional(),
    driverSignature: z.string().optional()
}).strict();

// Get Verification Query Schema
export const GetVerificationQuerySchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int().positive('Invalid verification ID'))
}).strict();

// List Verifications Query Schema
export const ListVerificationsQuerySchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional().default(1),
    pageSize: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional().default(10)
}).strict();

// Export types
export type CreateDriver = z.infer<typeof CreateDriverSchema>;
export type FreightDetailInput = z.infer<typeof FreightDetailInputSchema>;
export type CreateIDVerification = z.infer<typeof CreateIDVerificationSchema>;
export type CreateVerificationPayload = z.infer<typeof CreateVerificationPayloadSchema>;
export type UpdateDriver = z.infer<typeof UpdateDriverSchema>;
export type GetVerificationQuery = z.infer<typeof GetVerificationQuerySchema>;
export type ListVerificationsQuery = z.infer<typeof ListVerificationsQuerySchema>;
