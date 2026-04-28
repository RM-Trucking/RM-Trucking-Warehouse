import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */

type ValidationType = 'body' | 'query' | 'params';

interface ValidationError {
    success: false;
    message: string;
    errors: {
        field: string;
        message: string;
    }[];
}

export interface ValidatedRequest extends Request {
    validatedData?: any;
}

/**
 * Create validation middleware
 * @param schema - Zod schema to validate against
 * @param type - Which part of request to validate (body, query, params)
 * @returns Express middleware
 */
export function validateRequest(
    schema: ZodSchema,
    type: ValidationType = 'body'
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dataToValidate = req[type];

            // Parse and validate against schema
            const validatedData = await schema.parseAsync(dataToValidate);

            // Attach validated data to request
            (req as ValidatedRequest).validatedData = validatedData;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorResponse: ValidationError = {
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                };
                res.status(400).json(errorResponse);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    };
}

/**
 * Standalone validation function
 * Use when middleware is not suitable
 */
export async function validateData<T>(
    data: unknown,
    schema: ZodSchema
): Promise<{ success: true; data: T } | { success: false; errors: ValidationError['errors'] }> {
    try {
        const validatedData = await schema.parseAsync(data);
        return { success: true, data: validatedData as T };
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                errors: error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            };
        }
        return {
            success: false,
            errors: [{ field: 'unknown', message: 'Validation failed' }]
        };
    }
}

/**
 * Safe parse wrapper with better error formatting
 */
export async function safeParse<T>(
    data: unknown,
    schema: ZodSchema
): Promise<{ ok: true; data: T } | { ok: false; error: string; details: any }> {
    try {
        const result = await schema.parseAsync(data);
        return { ok: true, data: result as T };
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                ok: false,
                error: 'Validation error',
                details: error.issues
            };
        }
        return {
            ok: false,
            error: 'Unknown error',
            details: null
        };
    }
}
