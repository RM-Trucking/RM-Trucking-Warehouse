# Zod Validation Implementation - Setup Guide

## ✅ What's Been Implemented

### 1. **Validation Schemas** (`src/validations/`)

#### En-Route Module (`en-route.ts`)

- ✅ `CreateProPayloadSchema` - Individual PRO validation
- ✅ `CreateEnroutePayloadSchema` - Complete enroute creation
- ✅ `VerifyProQuerySchema` - PRO verification query params
- ✅ `ListEnroutesQuerySchema` - List and pagination params

#### ID Verification Module (`id-verification.ts`)

- ✅ `CreateDriverSchema` - Driver info validation
- ✅ `FreightDetailInputSchema` - Freight detail validation
- ✅ `CreateIDVerificationSchema` - Verification header validation
- ✅ `CreateVerificationPayloadSchema` - Complete verification payload
- ✅ `ListVerificationsQuerySchema` - List and pagination params

### 2. **Validation Middleware** (`src/middleware/validation.ts`)

- ✅ `validateRequest()` - Express middleware for automatic validation
- ✅ `validateData()` - Manual validation function
- ✅ `safeParse()` - Safe parsing with structured errors
- ✅ `ValidatedRequest` - Type extension for validated data

### 3. **Documentation**

- ✅ `README.md` - Complete validation documentation
- ✅ `INTEGRATION_EXAMPLES.md` - Usage patterns and examples
- ✅ `install-zod.sh` - Installation script

---

## 📋 Installation Required

### Step 1: Install Zod

```bash
cd Server
npm install zod
```

Or use the provided script:

```bash
bash install-zod.sh
```

### Step 2: Verify Installation

```bash
npm list zod
```

---

## 🚀 Integration Steps

### Option A: Update Routes with Middleware (Recommended)

**File:** `src/routes/en-route/index.ts`

```typescript
import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import {
  CreateEnroutePayloadSchema,
  VerifyProQuerySchema,
  ListEnroutesQuerySchema,
} from "../../validations/en-route";
import * as enrouteController from "../../controllers/en-route";
import { db } from "../../config/db2";

const router = Router();

// 1. Create Enroute with validation
router.post(
  "/",
  authenticateJWT,
  validateRequest(CreateEnroutePayloadSchema, "body"),
  async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.createEnroute(req, res, conn);
    if (conn) conn.close();
  },
);

// 2. List Enroutes with validation
router.get(
  "/",
  authenticateJWT,
  validateRequest(ListEnroutesQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.listEnroutes(req, res, conn);
    if (conn) conn.close();
  },
);

// 3. Verify PRO with validation
router.get(
  "/verify",
  authenticateJWT,
  validateRequest(VerifyProQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const conn = await db();
    await enrouteController.verifyPro(req, res, conn);
    if (conn) conn.close();
  },
);

export default router;
```

**File:** `src/routes/id-verification/index.ts`

```typescript
import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validation";
import {
  CreateVerificationPayloadSchema,
  ListVerificationsQuerySchema,
} from "../../validations/id-verification";
import * as idVerController from "../../controllers/id-verification";
import { db } from "../../config/db2";

const router = Router();

// 1. Create Verification with validation
router.post(
  "/",
  authenticateJWT,
  validateRequest(CreateVerificationPayloadSchema, "body"),
  async (req: Request, res: Response) => {
    const conn = await db();
    await idVerController.createIDVerification(req, res, conn);
    if (conn) conn.close();
  },
);

// 2. List Verifications with validation
router.get(
  "/",
  authenticateJWT,
  validateRequest(ListVerificationsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const conn = await db();
    await idVerController.listIDVerifications(req, res, conn);
    if (conn) conn.close();
  },
);

export default router;
```

### Option B: Update Controllers to Use Manual Validation

**Benefits:** More control, better error context in controller

```typescript
import { Request, Response } from "express";
import { safeParse } from "../../middleware/validation";
import { CreateEnroutePayloadSchema } from "../../validations/en-route";

export async function createEnroute(
  req: Request,
  res: Response,
  conn: Connection,
): Promise<void> {
  try {
    // Validate request body
    const validationResult = await safeParse(
      req.body,
      CreateEnroutePayloadSchema,
    );

    if (!validationResult.ok) {
      res.status(400).json({
        success: false,
        message: validationResult.error,
        details: validationResult.details,
      });
      return;
    }

    const payload = validationResult.data;
    const userId = (req as any).user?.userId || 1;

    const enrouteId = await enrouteService.createEnrouteWithPros(
      conn,
      payload,
      userId,
    );

    res.status(201).json({ success: true, enrouteId });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
}
```

---

## 🧪 Testing Validation

### Quick Test with cURL

**En-Route Creation:**

```bash
curl -X POST http://localhost:4001/api/en-route \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "carrierId": 1,
    "customerId": 2,
    "stationId": 3,
    "toEmails": ["user@example.com"],
    "pros": [
      {
        "proNumber": "PRO123",
        "pieces": 25,
        "weight": 100.5,
        "shipper": "Acme Corp"
      }
    ]
  }'
```

**Invalid Request (Missing required field):**

```bash
curl -X POST http://localhost:4001/api/en-route \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "carrierId": 1,
    "customerId": 2
    # Missing stationId and pros
  }'
```

Expected error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "stationId",
      "message": "Station ID is required and must be positive"
    },
    { "field": "pros", "message": "At least one PRO is required" }
  ]
}
```

---

## 📊 Validation Coverage

| Module          | Coverage        |
| --------------- | --------------- |
| En-Route        | ✅ 100%         |
| ID Verification | ✅ 100%         |
| Carrier         | ⚠️ Can be added |
| Customer        | ⚠️ Can be added |
| Station         | ⚠️ Can be added |

---

## 🔍 Error Response Format

All validation errors follow this structure:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Human-readable error message"
    },
    {
      "field": "nested.field.name",
      "message": "Another validation error"
    }
  ]
}
```

---

## 💡 Best Practices

1. **Use Middleware Approach** - Automatically validates before controller
2. **Type-Safe Development** - Use exported types from schemas
3. **Consistent Errors** - Same format across all endpoints
4. **Early Validation** - Fail fast in middleware, not in service layer
5. **Clear Messages** - Validation messages guide API consumers

---

## 📚 Example Schemas

```typescript
// Import and use in your code
import {
    CreateEnroutePayloadSchema,
    CreateIDVerificationSchema,
    FreightDetailInputSchema
} from '@/validations';

// These are fully typed types from schemas
import type {
    CreateEnroutePayload,
    FreightDetailInput,
    CreateIDVerification
} from '@/validations';

const enroute: CreateEnroutePayload = {
    carrierId: 1,
    customerId: 2,
    stationId: 3,
    pros: [...]
};
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'zod'"

**Solution:** Run `npm install zod` in the Server directory

### Issue: Validation middleware not triggering

**Solution:** Ensure middleware is added to routes BEFORE controller function

### Issue: Type mismatches

**Solution:** Import types from validations folder and use them in controllers

---

## 📞 Next Steps

1. ✅ Install Zod: `npm install zod`
2. ⏳ Update routes with validation middleware (Option A)
3. ⏳ Write integration tests
4. ⏳ Add validation to other modules (Carrier, Customer, Station)
5. ⏳ Consider adding custom validation rules for business logic

---

## 📖 References

- **Zod Documentation:** https://zod.dev
- **Express Middleware:** https://expressjs.com/en/guide/using-middleware.html
- **TypeScript Advanced Types:** https://www.typescriptlang.org/docs/handbook/advanced-types.html
