import { z } from 'zod';

/**
 * En-Route Validation Schemas using Zod
 */

// PRO Payload Validation
export const CreateProPayloadSchema = z.object({
    proNumber: z.string().min(1, 'PRO number is required').trim().max(50, 'PRO number must be at most 50 characters'),
    pieces: z.number().positive('Pieces must be positive'),
    weight: z.number().positive('Weight must be positive'),
    shipper: z.string().min(1, 'Shipper is required').trim().max(255, 'Shipper must be at most 255 characters'),
    activeStatus: z.enum(['Y', 'N']).optional().default('Y')
});

// Create Enroute Payload Validation
export const CreateEnroutePayloadSchema = z.object({
    carrierId: z.number().int().positive('Carrier is required'),
    customerId: z.number().int().positive('Customer is required'),
    stationId: z.number().int().positive('Station is required'),
    estimatedDate: z.string().nullable().optional().default(""),
    shippedDate: z.string().nullable().optional().default(""),
    toEmails: z.array(z.string().email('Invalid email format')).optional(),
    pros: z.array(CreateProPayloadSchema)
        .min(1, 'At least one PRO is required')
        .max(100, 'Maximum 100 PROs allowed')
}).strict();

// Query Parameters for Verify PRO
export const VerifyProQuerySchema = z.object({
    carrierId: z.string().transform(Number).pipe(z.number().int().positive('Invalid carrier ID')),
    proNumber: z.string().min(1, 'PRO number is required').trim().max(50, 'PRO number must be at most 50 characters')
}).strict();

// List Enroutes Query Validation
export const ListEnroutesQuerySchema = z.object({
    searchTerm: z.string().optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional().default(1),
    pageSize: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional().default(10)
}).strict();

// Export types
export type CreateProPayload = z.infer<typeof CreateProPayloadSchema>;
export type CreateEnroutePayload = z.infer<typeof CreateEnroutePayloadSchema>;
export type VerifyProQuery = z.infer<typeof VerifyProQuerySchema>;
export type ListEnroutesQuery = z.infer<typeof ListEnroutesQuerySchema>;
