# Zod Validation Setup

## Overview

Comprehensive Zod schema validation for **En-Route** and **ID Verification** modules. This provides runtime type safety, better error handling, and automatic request validation.

## Files Created

### 1. **validations/en-route.ts**

Validation schemas for En-Route operations:

- `CreateProPayloadSchema` - Validates individual PRO records
- `CreateEnroutePayloadSchema` - Validates complete enroute creation payload
- `VerifyProQuerySchema` - Validates query parameters for PRO verification
- `ListEnroutesQuerySchema` - Validates pagination and search parameters

**Key Features:**

- Positive number validation for IDs
- Email format validation for toEmails array
- PRO array length limits (min: 1, max: 100)
- Active status enum validation (Y/N)

### 2. **validations/id-verification.ts**

Validation schemas for ID Verification:

- `CreateDriverSchema` - Validates driver information
- `FreightDetailInputSchema` - Validates individual freight details
- `CreateIDVerificationSchema` - Validates verification header
- `CreateVerificationPayloadSchema` - Validates complete verification request
- `ListVerificationsQuerySchema` - Validates pagination

**Key Features:**

- Driver name and signature validation
- First/Second ID type and match boolean validation
- Flexible toEmails handling (array or JSON string)
- Freight detail array validation (min: 1, max: 100)

### 3. **middleware/validation.ts**

Reusable validation middleware and utilities:

- `validateRequest()` - Express middleware for automatic validation
- `validateData()` - Standalone validation function
- `safeParse()` - Wrapped safe parsing with better error formatting
- `ValidatedRequest` - Extended Request type for validated data

**Error Response Format:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "carrierId",
      "message": "Carrier ID is required and must be positive"
    },
    { "field": "pros.0.pieces", "message": "Pieces must be positive" }
  ]
}
```

## Benefits

✅ **Runtime Type Safety** - Validates data at runtime, not just TypeScript compile time
✅ **Structured Errors** - Clear, specific error messages for each validation failure
✅ **Consistency** - Same validation logic across all request types
✅ **Auto-Documentation** - Schemas document expected request structures
✅ **Type Inference** - Inferred types from schemas for full TypeScript support
✅ **Reusability** - Share schemas across controllers, services, and tests
✅ **Performance** - Fail fast with validation before reaching database layer

## Validation Rules Implemented

### En-Route Module

| Field         | Rule                  | Example                |
| ------------- | --------------------- | ---------------------- |
| carrierId     | Positive integer      | 5                      |
| customerId    | Positive integer      | 10                     |
| stationId     | Positive integer      | 3                      |
| estimatedDate | ISO datetime or null  | "2026-04-30T10:00:00Z" |
| toEmails      | Array of valid emails | ["user@example.com"]   |
| pros          | Array, 1-100 items    | [...]                  |
| proNumber     | Non-empty string      | "PRO123"               |
| pieces        | Positive number       | 25                     |
| weight        | Positive number       | 100.5                  |
| shipper       | Non-empty string      | "Acme Corp"            |
| activeStatus  | 'Y' or 'N'            | "Y"                    |

### ID Verification Module

| Field              | Rule                | Example           |
| ------------------ | ------------------- | ----------------- |
| carrierId          | Positive integer    | 5                 |
| driverName         | Non-empty string    | "John Doe"        |
| driverSignature    | String              | "signature_path"  |
| firstIdType        | Non-empty string    | "Driver License"  |
| firstIdPhotoMatch  | Boolean             | true              |
| verifiedByEmployee | Non-empty string    | "emp_001"         |
| toEmails           | Email array or JSON | ["a@example.com"] |
| customerId         | Positive integer    | 10                |
| stationId          | Positive integer    | 3                 |
| proNumber          | Non-empty string    | "PRO123"          |
| pieces             | Positive number     | 50                |
| weight             | Positive number     | 200               |
| shipper            | Non-empty string    | "Shipper Inc"     |

## Usage Examples

### Option 1: Middleware Approach (Recommended)

```typescript
import { Router } from "express";
import { validateRequest } from "../../middleware/validation";
import { CreateEnroutePayloadSchema } from "../../validations";

const router = Router();

router.post(
  "/",
  authenticateJWT,
  validateRequest(CreateEnroutePayloadSchema, "body"),
  async (req, res) => {
    const payload = req.validatedData; // Already validated
    // ... rest of controller logic
  },
);
```

### Option 2: Manual Validation in Controller

```typescript
import { safeParse } from "../../middleware/validation";
import { CreateEnroutePayloadSchema } from "../../validations";

export async function createEnroute(
  req: Request,
  res: Response,
  conn: Connection,
) {
  const validationResult = await safeParse(
    req.body,
    CreateEnroutePayloadSchema,
  );

  if (!validationResult.ok) {
    return res.status(400).json({
      success: false,
      error: validationResult.error,
      details: validationResult.details,
    });
  }

  const payload = validationResult.data;
  // ... use validated payload
}
```

## Next Steps

1. **Update Routes** - Add validation middleware to all routes:
   - `src/routes/en-route/index.ts`
   - `src/routes/id-verification/index.ts`

2. **Update Controllers** - Use validated data from requests

3. **Testing** - Create test files with example payloads:
   - `src/validations/__tests__/en-route.test.ts`
   - `src/validations/__tests__/id-verification.test.ts`

## Dependencies

Ensure Zod is installed:

```bash
npm install zod
```

## Type Safety

All schemas export inferred TypeScript types:

```typescript
import { CreateEnroutePayload, FreightDetailInput } from '@/validations';

// These are fully typed from the schema
const payload: CreateEnroutePayload = { ... };
const detail: FreightDetailInput = { ... };
```

This ensures your TypeScript matches your runtime validation exactly.
