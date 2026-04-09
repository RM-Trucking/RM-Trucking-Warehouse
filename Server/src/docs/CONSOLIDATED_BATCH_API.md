# Image Upload - Consolidated API Solution

## Summary

Image uploads have been integrated directly into the existing **`POST /api/warehouse-receipt/batch`** endpoint. No separate endpoint needed.

## How It Works

### Single Unified Endpoint

- **`POST /api/warehouse-receipt/batch`**
- Accepts **both JSON and multipart/form-data**
- Router detects if files are present and routes accordingly

### Two Usage Modes

#### Mode 1: JSON Only (No Images)

Send standard JSON request:

```bash
curl -X POST http://localhost:5000/api/warehouse-receipt/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receipts": [
      {
        "receipt": { /* ... */ },
        "freightDetails": [ /* ... */ ]
      }
    ]
  }'
```

#### Mode 2: Multipart with Images

Send FormData with both batch data and images:

```bash
curl -X POST http://localhost:5000/api/warehouse-receipt/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'batchData={"receipts":[...]}' \
  -F "freight-0-0-0=@image1.jpg" \
  -F "freight-0-0-1=@image2.jpg" \
  -F "freight-0-1-0=@image3.jpg"
```

### Image Field Naming Convention

`freight-{receiptIndex}-{freightIndex}-{imageIndex}`

Examples:

- `freight-0-0-0` → receipts[0].freightDetails[0].images[0]
- `freight-0-0-1` → receipts[0].freightDetails[0].images[1]
- `freight-0-1-0` → receipts[0].freightDetails[1].images[0]
- `freight-1-0-0` → receipts[1].freightDetails[0].images[0]

## Implementation Changes

### Routes (`src/routes/warehouse-receipt/index.ts`)

```typescript
router.post("/batch", authenticateJWT, upload.any(), async (req, res) => {
  const conn = await db();
  try {
    // Check if images are present
    const hasImages = req.files && req.files.length > 0;
    if (hasImages) {
      await batchProcessWarehouseReceiptsWithImages(req, res, conn);
    } else {
      await batchProcessWarehouseReceipts(req, res, conn);
    }
  } finally {
    conn.close();
  }
});
```

### Controller (`src/controllers/warehouse-receipt/index.ts`)

- **`batchProcessWarehouseReceipts()`** - Handles JSON-only requests (unchanged)
- **`batchProcessWarehouseReceiptsWithImages()`** - Handles multipart with images (new)

### Services (`src/services/warehouse-receipt/index.ts`)

All batch processing functions now support images:

- `createWarehouseReceiptWithFreightService()`
- `batchProcessWarehouseReceiptsService()`

Image handling:

1. Extracts `images` array from freight item
2. Creates freight record
3. Creates image records linked to freight
4. Returns complete freight with images

### Database Layer (`src/database/warehouse-receipt/index.ts`)

New functions:

- `createFreightImage(conn, freightId, imagePath)`
- `getFreightImages(conn, freightId)`
- `deleteFreightImage(conn, imageId)`
- `deleteFreightImagesByFreight(conn, freightId)`
- `getFreightInfoById(conn, freightId)`

### Image Handler Service (`src/services/warehouse-receipt/image-handler.ts`)

- `processUploadedImages()` - Maps files to freight items
- `validateBatchData()` - Validates batch structure

### Multer Config (`src/config/multer.ts`)

- Automatic directory creation: `uploads/freight-images/`
- File validation: JPEG, PNG, GIF, WebP only
- Size limits: 10MB per file, 100 files max
- Auto-generates unique filenames with timestamps

### Swagger (`src/swagger/warehouseReceipt.yaml`)

Updated batch endpoint documentation:

- Both `application/json` and `multipart/form-data` content types
- Example file field names
- Image upload constraints documented
- Response includes `filesProcessed` count
- New schemas: `FreightImage`, updated `FreightInfo`, updated `CreateFreightDetail`

## Response Format

### Without Images (JSON mode)

```json
{
  "success": true,
  "message": "Batch process completed successfully",
  "data": {
    "updated": [...],
    "created": [...],
    "totalUpdated": 1,
    "totalCreated": 1
  }
}
```

### With Images (Multipart mode)

```json
{
  "success": true,
  "message": "Batch process completed successfully",
  "filesProcessed": 5,
  "data": {
    "updated": [...],
    "created": [
      {
        "receiptId": 20,
        "freightInfos": [
          {
            "freightId": 100,
            "pieces": 20,
            "images": [
              {
                "imageId": 456,
                "imagePath": "uploads/freight-images/image1-1649000000000.jpg",
                "uploadedAt": "2026-04-07T10:30:00Z"
              }
            ]
          }
        ]
      }
    ],
    "totalUpdated": 1,
    "totalCreated": 1
  }
}
```

## Key Features

✅ **Single Endpoint** - `/batch` handles everything  
✅ **Flexible** - Works with or without images  
✅ **Automatic Routing** - Detects file presence  
✅ **Atomic Transactions** - All or nothing  
✅ **Complete Responses** - Images included in returned freight items  
✅ **Proper Validation** - File type and size checks  
✅ **Clean File Names** - Auto-generated with timestamps  
✅ **Database Linked** - Images properly associated with freight

## Client Examples

### JavaScript - Without Images

```javascript
const response = await fetch('/api/warehouse-receipt/batch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ receipts: [...] })
});
```

### JavaScript - With Images

```javascript
const formData = new FormData();
formData.append('batchData', JSON.stringify({ receipts: [...] }));

// Add images
const images1 = document.getElementById('freight-0-0-images').files;
for (let i = 0; i < images1.length; i++) {
  formData.append(`freight-0-0-${i}`, images1[i]);
}

const response = await fetch('/api/warehouse-receipt/batch', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## Backward Compatibility

✅ **Fully compatible** with existing JSON-only clients  
✅ No breaking changes to existing API contract  
✅ Clients can upgrade to include images without any server changes needed from their perspective
