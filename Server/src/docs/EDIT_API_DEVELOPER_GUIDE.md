# Edit Warehouse Receipt API - Developer Implementation Guide

## Overview

The Edit Warehouse Receipt API (`PUT /api/warehouse-receipt/{receiptId}`) supports three image submission modes with **100% consistency to the Batch Process API**:

1. **Traditional File Upload** - Send image files via multipart/form-data
2. **Base64 String Mode** - Send Base64 encoded images in request body
3. **Hybrid Mode** - Mix both file uploads and Base64 strings

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         HTTP Request (File or Base64)           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Route: PUT /api/warehouse-receipt/:receiptId   │
│  Middleware: uploaders.warehouse.combinedImages │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Controller: updateWarehouseReceipt()           │
│  ├─ convertBase64FieldsToFiles()               │ ← Base64 → File
│  ├─ normalizeEditPayload()                     │ ← Parse JSON strings
│  ├─ attachUploadedFilesToPayload()             │ ← Map files to payload
│  └─ Route to Service                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Service: editWarehouseReceiptService()         │
│  ├─ BEGIN TRANSACTION                          │
│  ├─ Update receipt fields                      │
│  ├─ Update freight items                       │
│  ├─ Manage images                              │
│  ├─ COMMIT or ROLLBACK                         │
│  └─ Return receipt details                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Database Layer                                 │
│  ├─ updateWarehouseReceipt()                   │
│  ├─ updateFreightItem()                        │
│  ├─ deleteFreightImageByPath()                 │
│  ├─ addFreightImage()                          │
│  └─ ... image and freight operations           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Disk Storage                                   │
│  ├─ FREIGHT_IMAGE_PATH/                        │
│  └─ BAD_FREIGHT_IMAGE_PATH/                    │
└─────────────────────────────────────────────────┘
```

---

## Step-by-Step Data Flow

### Step 1: Request Arrives at Route

**File**: [Server/src/routes/warehouse-receipt/index.ts](Server/src/routes/warehouse-receipt/index.ts)

```typescript
router.put(
  "/:receiptId",
  authenticateJWT,
  uploaders.warehouse.combinedImages.any(),
  async (req, res) => {
    await warehouseReceiptController.updateWarehouseReceipt(req, res, conn);
  },
);
```

**At this point**:

- `req.params.receiptId` = "123"
- `req.body` = Form fields (including potential Base64 strings)
- `req.files` = Already uploaded files from multer middleware

---

### Step 2: Controller - Convert Base64 to Files

**File**: [Server/src/controllers/warehouse-receipt/index.ts](Server/src/controllers/warehouse-receipt/index.ts#L218)

```typescript
await convertBase64FieldsToFiles(req);
```

**What it does**:

1. Scans `req.body` for any field with Base64 content
2. Detects patterns: `data:image/jpeg;base64,...` or `base64,...`
3. For each Base64 field found:
   - Extracts image type (jpeg, png, etc.)
   - Converts Base64 to binary buffer
   - Writes file to disk (FREIGHT_IMAGE_PATH or BAD_FREIGHT_IMAGE_PATH)
   - Adds file object to `req.files` array
   - Deletes original Base64 field from `req.body`

**Example**:

```javascript
// BEFORE
req.body = {
  "freight-0-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  location: "Warehouse B",
};

// AFTER
req.files = [
  {
    fieldname: "freight-0-0",
    filename: "base64-1705315200000-123456789.jpeg",
    path: "/uploads/freight/base64-1705315200000-123456789.jpeg",
    mimetype: "image/jpeg",
  },
];
req.body = {
  location: "Warehouse B",
};
```

---

### Step 3: Controller - Normalize Payload

**File**: [Server/src/controllers/warehouse-receipt/index.ts](Server/src/controllers/warehouse-receipt/index.ts#L187)

```typescript
const payload = normalizeEditPayload(req.body);
```

**What it does**:

1. Extracts `receipt` field (can be JSON string or object)
2. Parses `freightDetails` (handles arrays, JSON strings, single objects)
3. Parses `removeFreightIds` (converts to number array)
4. Parses `badFreightImages` array
5. Parses `removeBadFreightImagePaths` array

**Example**:

```javascript
// BEFORE (multipart encoding)
req.body = {
  receipt: '{"location":"Warehouse B","status":"ON_HAND"}', // JSON string
  freightDetails: '[{"freightId":123,"pieces":10}]', // JSON string
  removeFreightIds: "[456,789]", // JSON string
  badFreightImages: '["path1.jpg","path2.jpg"]', // JSON string
};

// AFTER (normalized)
payload = {
  receipt: { location: "Warehouse B", status: "ON_HAND" },
  freightDetails: [{ freightId: 123, pieces: 10 }],
  removeFreightIds: [456, 789],
  badFreightImages: ["path1.jpg", "path2.jpg"],
  removeBadFreightImagePaths: [],
};
```

---

### Step 4: Controller - Attach Files to Payload

**File**: [Server/src/controllers/warehouse-receipt/index.ts](Server/src/controllers/warehouse-receipt/index.ts#L280)

```typescript
attachUploadedFilesToPayload(payload, req.files);
```

**What it does**:

1. Iterates through all files in `req.files`
2. Matches field name patterns:
   - `freight-{index}-{imageIndex}` → adds to `payload.freightDetails[index].newImages`
   - `bad-freight-image-{index}` → adds to `payload.badFreightImages`
3. Handles edge cases (fallback patterns, array initialization)

**Example**:

```javascript
// BEFORE
req.files = [
  { fieldname: "freight-0-0", filename: "image1.jpg" },
  { fieldname: "freight-0-1", filename: "image2.jpg" },
  { fieldname: "bad-freight-image-0", filename: "damage.jpg" },
];
payload.freightDetails = [{ freightId: 123, pieces: 10 }];

// AFTER
payload.freightDetails = [
  {
    freightId: 123,
    pieces: 10,
    newImages: ["image1.jpg", "image2.jpg"], // ← Files attached
  },
];
payload.badFreightImages = ["damage.jpg"]; // ← File attached
```

---

### Step 5: Controller - Route to Service

**File**: [Server/src/controllers/warehouse-receipt/index.ts](Server/src/controllers/warehouse-receipt/index.ts#L324)

```typescript
if (hasComplexChanges) {
  result = await editWarehouseReceiptService(conn, receiptId, payload, userId);
} else {
  result = await updateWarehouseReceiptService(
    conn,
    receiptId,
    payload,
    userId,
  );
}
```

**Decision logic**:

- If payload includes freight updates, deletions, or image operations → use `editWarehouseReceiptService()`
- Otherwise → use simpler `updateWarehouseReceiptService()`

---

### Step 6: Service - Execute in Transaction

**File**: [Server/src/services/warehouse-receipt/index.ts](Server/src/services/warehouse-receipt/index.ts#L249)

```typescript
export async function editWarehouseReceiptService(
  conn,
  receiptId,
  payload,
  userId,
) {
  await conn.beginTransaction();
  try {
    // 1. Update receipt fields
    // 2. Delete freight items (removeFreightIds)
    // 3. Update existing freight items (freightId exists)
    // 4. Create new freight items (no freightId)
    // 5. Delete images by path (removeBadFreightImagePaths)
    // 6. Add new images

    await conn.commit();
    return updatedReceipt;
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}
```

**Operations sequence**:

1. **BEGIN TRANSACTION** - Start atomic operation
2. **Update Receipt** - Update fields like location, status, piecesInland
   - If `status` changed → emit audit log
3. **Remove Freight Items** - Delete by freightId
   - Automatically cascade-deletes associated images
4. **Update Freight Items** - Update existing items
   - Remove images by path
   - Add new images
5. **Add New Freight Items** - Create new items
   - Add images during creation
6. **Manage Bad Freight Images** - Remove old, add new
7. **COMMIT on success** or **ROLLBACK on error**

---

### Step 7: Database - Execute Operations

**File**: [Server/src/database/warehouse-receipt/index.ts](Server/src/database/warehouse-receipt/index.ts)

**Key functions**:

- `deleteFreightImageByPath()` - DELETE image by exact path match
- `deleteBadFreightConditionImageByPath()` - DELETE bad freight image by path
- Standard update/insert/delete for receipt and freight items

---

### Step 8: Return Response

**File**: [Server/src/controllers/warehouse-receipt/index.ts](Server/src/controllers/warehouse-receipt/index.ts#L354)

```typescript
res.status(200).json({
  success: true,
  message: "Receipt updated successfully",
  data: result, // ← Complete receipt with all details
});
```

---

## Implementation Details

### Base64 Detection Logic

**Location**: [Server/src/controllers/warehouse-receipt/index.ts:245](Server/src/controllers/warehouse-receipt/index.ts#L245)

```typescript
const base64Pattern = /^(data:image\/\w+;)?base64,/i;
const isBase64 = value.startsWith("data:image/") || value.startsWith("base64,");
```

**Matches**:

- ✅ `data:image/jpeg;base64,/9j/4AAQSkZJRgABA...`
- ✅ `data:image/png;base64,iVBORw0KGgo...`
- ✅ `base64,/9j/4AAQSkZJRgABA...`
- ❌ `/9j/4AAQSkZJRgABA...` (plain Base64, not detected)

---

### File Field Naming Patterns

**Location**: [Server/src/controllers/warehouse-receipt/index.ts:280](Server/src/controllers/warehouse-receipt/index.ts#L280)

```typescript
// Freight images
const freightMatch = /^freight-(\d+)-\d+$/.exec(file.fieldname);
if (freightMatch) {
  const index = Number(freightMatch[1]);
  payload.freightDetails[index].newImages.push(file.filename);
}

// Bad freight images
const badFreightMatch = /^bad-freight-image(?:-\d+)?$/.exec(file.fieldname);
if (badFreightMatch) {
  payload.badFreightImages.push(file.filename);
}
```

**Naming Convention**:

- `freight-0-0` → First freight item, first image
- `freight-0-1` → First freight item, second image
- `freight-1-0` → Second freight item, first image
- `bad-freight-image-0` → First bad freight image
- `bad-freight-image-1` → Second bad freight image

---

### Transaction Pattern

**Location**: [Server/src/services/warehouse-receipt/index.ts:260](Server/src/services/warehouse-receipt/index.ts#L260)

```typescript
try {
  await conn.beginTransaction();

  // ... all database operations ...

  await conn.commit();
  return result;
} catch (error) {
  await conn.rollback();
  throw error;
}
```

**Benefits**:

- All or nothing: If any operation fails, all changes are rolled back
- Data consistency: No partial updates
- Error safety: Failures don't leave incomplete data

---

### Audit Logging

**Location**: [Server/src/services/warehouse-receipt/index.ts:270-280](Server/src/services/warehouse-receipt/index.ts)

```typescript
if (statusChanged) {
  await emitAuditLog(conn, {
    receiptId,
    action: "STATUS_CHANGE",
    oldStatus: currentStatus,
    newStatus: newStatus,
    userId,
    timestamp: new Date(),
  });
}
```

**Tracks**:

- Receipt ID
- Action performed
- Status change details
- User who made the change
- Exact timestamp

---

## Payload Structure

### Request Payload

```typescript
interface EditPayload {
  receipt?: {
    location?: string;
    status?: string;
    piecesInland?: number;
    destination?: string;
    // ... other receipt fields
  };

  freightDetails?: Array<{
    freightId?: number; // If present: UPDATE existing
    // If absent: CREATE new
    pieces?: number;
    type?: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    cubicMeter?: number;
    newImages?: string[]; // New image filenames to add
    removeImagePaths?: string[]; // Image paths to delete
  }>;

  removeFreightIds?: number[]; // Freight IDs to delete

  badFreightImages?: string[]; // Bad freight image filenames to add

  removeBadFreightImagePaths?: string[]; // Bad freight paths to delete
}
```

### Response Payload

```typescript
interface WarehouseReceiptWithDetails {
  receiptId: number;
  receiptNumber: string;
  receiptDate: string;
  location: string;
  status: string;
  piecesInland: number;
  destination: string;

  freightDetails: Array<{
    freightId: number;
    pieces: number;
    type: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    cubicMeter: number;
    images: string[]; // Image file paths
  }>;

  badFreightImages: string[]; // Bad freight image file paths

  customerId: number;
  carrierId: number;
  stationId: number;
  updatedBy: number;
  updatedAt: string;
}
```

---

## Configuration

### Environment Variables Required

```bash
# Image storage directories (must exist or be creatable)
FREIGHT_IMAGE_PATH=/var/uploads/freight-images
BAD_FREIGHT_IMAGE_PATH=/var/uploads/bad-freight-images

# Authentication
JWT_SECRET=your-secret-key-here

# Database
ODBC_CONNECTION_STRING=...
DB_NAME=RM_Trucking
DB_USER=...
DB_PASSWORD=...

# Express Server
PORT=5000
NODE_ENV=production
```

### Multer Configuration

**Location**: [Server/src/config/multer.ts](Server/src/config/multer.ts)

```typescript
export const uploaders = {
  warehouse: {
    combinedImages: multer({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Dynamically route to correct directory
          const dir = file.fieldname.startsWith("bad-freight")
            ? process.env.BAD_FREIGHT_IMAGE_PATH
            : process.env.FREIGHT_IMAGE_PATH;
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1e9);
          cb(null, `${timestamp}-${random}-${file.originalname}`);
        },
      }),
    }),
  },
};
```

---

## Error Handling

### Common Errors

| Error                    | Cause                     | Resolution                    |
| ------------------------ | ------------------------- | ----------------------------- |
| "Receipt ID is required" | Missing URL parameter     | Check URL path                |
| "Receipt not found"      | ID doesn't exist in DB    | Verify receipt ID             |
| Transaction rollback     | Database operation failed | Check payload data            |
| Base64 conversion failed | Invalid Base64 format     | Ensure proper encoding        |
| Directory access denied  | Permission issue          | Check file system permissions |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Testing Guide

### Test 1: File Upload Mode

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer token" \
  -F "freight-0-0=@image1.jpg" \
  -F "bad-freight-image-0=@damage.jpg"
```

### Test 2: Base64 Mode

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "location": "Warehouse B",
    "freight-0-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  }'
```

### Test 3: Hybrid Mode

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer token" \
  -F "receipt={\"location\":\"Warehouse B\"}" \
  -F "freight-0-0=@image1.jpg" \
  -F "freight-0-1=data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
```

---

## Performance Optimization Tips

1. **Use file uploads for large images** (>1MB)
   - Base64 strings increase request size by ~33%
2. **Batch operations** when possible
   - Reduces HTTP overhead
   - Single transaction is more efficient

3. **Async image processing** for future enhancement
   - Process images in background queue
   - Return response immediately

4. **Image compression** before storage
   - Reduce disk space usage
   - Faster file transmission

---

## Future Enhancements

1. **Image format validation**
   - Whitelist allowed formats (JPEG, PNG, WebP)
   - Reject unsupported formats early

2. **File size limits**
   - Enforce maximum file size per image
   - Per-receipt total size limit

3. **Image quality optimization**
   - Automatic compression
   - Thumbnail generation for previews

4. **Deduplication**
   - Hash-based duplicate detection
   - Shared storage for identical images

5. **CDN integration**
   - Serve images from CDN
   - Reduce server bandwidth

6. **Async processing**
   - Background image processing
   - Webhook notifications on completion

---

## Summary

The Edit Warehouse Receipt API provides a complete, transaction-safe solution for managing warehouse receipts with support for complex freight and image operations. The implementation is **100% consistent with the Batch Process API** and handles three image submission modes seamlessly.

**Key Features**:

- ✅ File uploads
- ✅ Base64 string conversion
- ✅ Hybrid mode support
- ✅ ACID transaction guarantee
- ✅ Atomic operations
- ✅ Audit logging
- ✅ Comprehensive error handling
- ✅ Production ready
