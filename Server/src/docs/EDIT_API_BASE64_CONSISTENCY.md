# Edit Warehouse Receipt API - Base64 & File Upload Consistency

## Overview

The Edit Warehouse Receipt API (`PUT /api/warehouse-receipt/:receiptId`) supports three image submission modes, consistent with the Batch Process API pattern:

1. **Traditional File Upload** - Send actual image files
2. **Base64 String Mode** - Send Base64 encoded images in request body
3. **Hybrid Mode** - Combine both in same request

---

## Implementation Pattern: File + Base64 Support

### 1. Controller Layer Handling

**File:** `Server/src/controllers/warehouse-receipt/index.ts`  
**Function:** `updateWarehouseReceipt()`

#### Step 1: Convert Base64 Strings to Files

```typescript
// Detects any body field with Base64 data URI or base64 string
const convertBase64FieldsToFiles = (req: Request): Promise<void> => {
  // Matches:
  // - "data:image/jpeg;base64,..."
  // - "base64,..."
  // - "data:image/png;base64,..."
  const base64Pattern = /^(data:image\/\w+;)?base64,/i;

  // Converts detected Base64 fields to files on disk
  // Writes to configured image upload directories:
  // - FREIGHT_IMAGE_PATH
  // - BAD_FREIGHT_IMAGE_PATH
};
```

#### Step 2: Normalize Payload

```typescript
// Safely parses JSON strings and normalizes arrays
const normalizeEditPayload = (body: any): EditPayload => {
  // Handles various input formats:
  // - JSON strings (from multipart encoding)
  // - Objects (from JSON POST)
  // - Arrays and single values
  // - null/undefined
  // Returns normalized payload with:
  // - receipt: receipt fields
  // - freightDetails: array of freight items
  // - removeFreightIds: array of IDs to delete
  // - badFreightImages: array of bad freight image paths
  // - removeBadFreightImagePaths: array of paths to delete
};
```

#### Step 3: Attach Uploaded Files to Payload

```typescript
// Maps physical uploaded files to payload structure
const attachUploadedFilesToPayload = (
  req: Request,
  payload: EditPayload,
): void => {
  // Processes req.files from multer middleware
  // Uses field name patterns to map files to correct locations:

  // Pattern: freight-{freightIndex}-{imageIndex}
  // Maps to: payload.freightDetails[freightIndex].newImages
  const freightMatch = /^freight-(\d+)-\d+$/.exec(file.fieldname);

  // Pattern: bad-freight-image-{index}
  // Maps to: payload.badFreightImages array
  const badFreightMatch = /^bad-freight-image-/.exec(file.fieldname);
};
```

#### Step 4: Route to Service

```typescript
// Determines if complex edit (with freight/image changes) needed
if (hasComplexChanges) {
  await editWarehouseReceiptService(conn, receiptId, normalizedPayload, userId);
} else {
  await updateWarehouseReceiptService(
    conn,
    receiptId,
    normalizedPayload,
    userId,
  );
}
```

---

## Multipart/Form-Data Support

### File Upload Mode

Send actual image files using multipart/form-data:

```
Content-Type: multipart/form-data; boundary=----...

------...
Content-Disposition: form-data; name="freight-0-0"; filename="image1.jpg"
Content-Type: image/jpeg

[binary image data]
------...
Content-Disposition: form-data; name="freight-0-1"; filename="image2.jpg"
Content-Type: image/jpeg

[binary image data]
------...
Content-Disposition: form-data; name="bad-freight-image-0"; filename="damage.jpg"
Content-Type: image/jpeg

[binary image data]
------...
```

### Base64 String Mode (Like Batch API)

Send Base64 encoded images in request body fields:

```json
{
  "freight-0-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "freight-0-1": "base64,/9j/4AAQSkZJRgABA...",
  "bad-freight-image-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "location": "Warehouse B",
  "status": "ON_HAND",
  "freightDetails": [...],
  "removeFreightIds": [456]
}
```

When Base64 strings are detected:

1. Automatically converted to image files on disk
2. Files written to configured directories (FREIGHT_IMAGE_PATH, BAD_FREIGHT_IMAGE_PATH)
3. File paths injected into `req.files` array as if they were uploaded
4. Processed through standard file attachment logic

### Hybrid Mode

Combine both file uploads and Base64 strings in the same multipart request:

```
Content-Type: multipart/form-data

Form fields:
- freight-0-0: [uploaded file] OR [Base64 string] OR both
- freight-0-1: [uploaded file]
- bad-freight-image-0: "data:image/jpeg;base64,..."
- freight-1-0: "base64,..."
- receipt: {"location": "Warehouse B", ...}
```

---

## Database Layer Changes

**File:** `Server/src/database/warehouse-receipt/index.ts`

### Image Deletion by Path

```typescript
// Removes single freight image by exact path match
deleteFreightImageByPath(conn, freightId, imagePath): Promise<void>

// Removes single bad freight image by exact path match
deleteBadFreightConditionImageByPath(conn, receiptId, imagePath): Promise<void>
```

These functions support atomic removal of images during edit operations.

---

## Service Layer Transaction Pattern

**File:** `Server/src/services/warehouse-receipt/index.ts`

### Edit Service with Atomic Transactions

```typescript
editWarehouseReceiptService(
  conn: Connection,
  receiptId: string,
  payload: EditPayload,
  userId: string
): Promise<WarehouseReceiptWithDetails> {
  // 1. BEGIN TRANSACTION
  conn.beginTransaction()

  // 2. Update receipt fields (with audit log on status change)
  // 3. Delete freight items (removeFreightIds)
  // 4. Update existing freight items (freightId exists)
  // 5. Create new freight items (no freightId)
  // 6. Delete images by path (removeBadFreightImagePaths)
  // 7. Add new images

  // 8. COMMIT on success, ROLLBACK on error
  conn.commit()
}
```

---

## Swagger Documentation

**File:** `Server/src/swagger/warehouseReceipt.yaml`

### Endpoint: PUT /api/warehouse-receipt/{receiptId}

Supports both `application/json` and `multipart/form-data` content types.

#### Request Body - JSON Mode

```json
{
  "location": "Warehouse B, Zone 2",
  "status": "ON_HAND",
  "piecesInland": 20,
  "updatedBy": 1,
  "freightDetails": [
    {
      "freightId": 123,
      "pieces": 10,
      "type": "Pallet",
      "images": ["uploads/freight/image1.jpg"]
    }
  ],
  "removeFreightIds": [456]
}
```

#### Request Body - Multipart Form-Data Mode

Includes all JSON fields PLUS file fields:

- `receipt`: JSON string (alternative to sending separate fields)
- `freightDetails`: JSON string array
- `removeFreightIds`: JSON string array
- `badFreightImages`: JSON string array
- `removeBadFreightImagePaths`: JSON string array
- `freight-{freightIndex}-{imageIndex}`: binary file or Base64 string
- `bad-freight-image-{index}`: binary file or Base64 string

#### Response

```json
{
  "success": true,
  "message": "Warehouse receipt updated successfully",
  "data": {
    "receiptId": "123",
    "location": "Warehouse B, Zone 2",
    "status": "ON_HAND",
    "freightDetails": [...],
    "badFreightImages": [...]
  }
}
```

---

## Consistency with Batch Process API

| Feature             | Batch API                                    | Edit API                        | Match               |
| ------------------- | -------------------------------------------- | ------------------------------- | ------------------- |
| File Upload Support | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| Base64 Conversion   | ✅ Yes (automatic)                           | ✅ Yes (automatic)              | ✅                  |
| Multipart/Form-Data | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| JSON String Fields  | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| Hybrid Mode         | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| Field Name Patterns | `freight-{receiptIdx}-{freightIdx}-{imgIdx}` | `freight-{freightIdx}-{imgIdx}` | ✅ (Single receipt) |
| Bad Freight Images  | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| Transaction Support | ✅ Yes                                       | ✅ Yes                          | ✅                  |
| Audit Logging       | ✅ Yes                                       | ✅ Yes                          | ✅                  |

### Key Difference

The Batch API uses `freight-{receiptIndex}-{freightIndex}-{imageIndex}` because it processes multiple receipts in one call.  
The Edit API uses `freight-{freightIndex}-{imageIndex}` because it operates on a single receipt context.

Both APIs share identical:

- Base64 detection logic (`data:image/` or `base64,` prefix matching)
- Multipart payload normalization (JSON string parsing)
- File attachment logic (field name pattern matching)
- Image file writing (FREIGHT_IMAGE_PATH, BAD_FREIGHT_IMAGE_PATH)
- Transaction and audit patterns

---

## Usage Examples

### Example 1: Upload files with form-data

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer {token}" \
  -F "receipt={\"location\":\"Warehouse B\",\"status\":\"ON_HAND\",\"updatedBy\":1}" \
  -F "freight-0-0=@image1.jpg" \
  -F "freight-0-1=@image2.jpg" \
  -F "bad-freight-image-0=@damage.jpg"
```

### Example 2: Send Base64 strings in JSON body

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "location": "Warehouse B",
    "status": "ON_HAND",
    "updatedBy": 1,
    "freight-0-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
    "freight-0-1": "base64,/9j/4AAQSkZJRgABA...",
    "bad-freight-image-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  }'
```

### Example 3: Hybrid - Mix files and Base64 in multipart

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer {token}" \
  -F "receipt={\"location\":\"Warehouse B\",\"updatedBy\":1}" \
  -F "freight-0-0=@image1.jpg" \
  -F "freight-0-1=data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." \
  -F "bad-freight-image-0=@damage.jpg"
```

---

## Validation & Error Handling

### Supported Content Types

- `application/json` - JSON payload with optional Base64 fields
- `multipart/form-data` - Mixed files, Base64 strings, and form fields

### Field Validation

- Receipt fields validated through entity schema
- Freight details validated (pieces, type, dimensions required where applicable)
- Image paths validated for format and existence
- IDs validated as numeric or string identifiers

### Error Responses

- `400 Bad Request` - Invalid payload, malformed JSON, invalid IDs
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Receipt ID doesn't exist
- `500 Internal Server Error` - Database or file system error

---

## Performance Considerations

1. **Base64 Conversion Cost**: Converting large Base64 strings to files has I/O cost; use file uploads for large images if possible
2. **Transaction Scope**: All operations within single transaction for consistency
3. **Image Storage**: Ensure sufficient disk space for FREIGHT_IMAGE_PATH and BAD_FREIGHT_IMAGE_PATH
4. **File Cleanup**: Removed images are deleted from disk; ensure proper backups

---

## Testing Checklist

- [ ] File upload works with single and multiple files
- [ ] Base64 strings in JSON body are converted correctly
- [ ] Hybrid mode (files + Base64) works together
- [ ] Image paths are correctly mapped to freight items
- [ ] Bad freight images are correctly attached
- [ ] Removed images are deleted from disk
- [ ] Removed freight items cascade-delete their images
- [ ] Transaction rollback works on error
- [ ] Audit logs created for status changes
- [ ] Response includes updated receipt with all details
