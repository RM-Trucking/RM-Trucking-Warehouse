# Image Upload Implementation - Complete Setup

## What Was Implemented

### 1. **Multer Configuration** (`src/config/multer.ts`)

- Configured file storage with automatic directory creation
- Custom filename generation (timestamp + random)
- File type validation (images only: JPEG, PNG, GIF, WebP)
- File size limits (10MB per file, 100 files max)
- Helper functions for path conversion

### 2. **Image Handler Service** (`src/services/warehouse-receipt/image-handler.ts`)

- `processUploadedImages()` - Maps uploaded files to freight items
- `validateBatchData()` - Validates batch structure before processing
- Handles field name parsing (format: `freight-{receiptIndex}-{freightIndex}-{imageIndex}`)

### 3. **Database Layer** (`src/database/warehouse-receipt/index.ts`)

**New functions added:**

- `createFreightImage(conn, freightId, imagePath)` - Create image record
- `getFreightImages(conn, freightId)` - Get all images for freight
- `deleteFreightImage(conn, imageId)` - Delete single image
- `deleteFreightImagesByFreight(conn, freightId)` - Delete all images for freight
- `getFreightInfoById(conn, freightId)` - Get single freight info

### 4. **Service Layer Updates** (`src/services/warehouse-receipt/index.ts`)

**Modified functions:**

- `getWarehouseReceiptWithDetailsService()` - Now fetches images for all freight
- `createWarehouseReceiptWithFreightService()` - Handles image array in freight details
- `batchProcessWarehouseReceiptsService()` - Handles image array for both CREATE and UPDATE
- `addFreightInfoService()` - Supports optional images array
- `updateFreightInfoService()` - Can replace images
- `getFreightInfoWithImagesService()` - New function to get freight with images
- `getReceiptSummaryService()` - Counts total images across freight

**Image Handling Flow:**

1. Extracts `images` array from freight data
2. Creates freight record first
3. Creates image records linked to freight via `freightId`
4. Returns complete freight object with `images` array

### 5. **Controller Layer** (`src/controllers/warehouse-receipt/index.ts`)

**New function:**

- `batchProcessWarehouseReceiptsWithImages()` - Handles multipart/form-data
  - Receives `batchData` as JSON string
  - Receives multiple image files
  - Validates batch structure
  - Processes images using `processUploadedImages()`
  - Calls batch service with image paths included

### 6. **Routes** (`src/routes/warehouse-receipt/index.ts`)

**New endpoint:**

- `POST /api/warehouse-receipt/batch-with-images`
  - Uses `upload.any()` middleware from multer
  - Requires JWT authentication
  - Accepts multipart/form-data

## Data Flow

### Client → Server

```
Client Form Data
    ↓
Contains two parts:
    ├── batchData (JSON string)
    │   └── receipts array with freight items (no images)
    └── Multiple image files
        └── Field names: freight-0-0-0, freight-0-0-1, freight-0-1-0, etc.
```

### Server Processing

```
Controller: batchProcessWarehouseReceiptsWithImages()
    ↓
1. Extract batchData JSON string and parse
2. Get uploaded files from req.files
3. Validate batch structure
4. Call imageHandler.processUploadedImages()
    ├── Parse field names
    ├── Map file paths to freight items
    └── Add images array to each freight
5. Call batchProcessWarehouseReceiptsService()
    ├── For each receipt:
    │   ├── If receiptId: UPDATE operation
    │   │   ├── Delete old freight items
    │   │   ├── Create new freight items
    │   │   ├── For each freight with images:
    │   │   │   └── Create image records in Warehouse_Receipt_Freight_Images
    │   │   └── Return updated receipt with freight + images
    │   └── If no receiptId: CREATE operation
    │       ├── Create new receipt
    │       ├── Create new freight items
    │       ├── For each freight with images:
    │       │   └── Create image records
    │       └── Return created receipt with freight + images
    └── Return { updated: [], created: [], totalUpdated, totalCreated }
```

## Example: Complete Workflow

### Frontend - Form with File Inputs

```html
<form id="batchForm">
  <!-- Receipt 0, Freight 0 images -->
  <input type="file" id="freight-0-0" multiple accept="image/*" />

  <!-- Receipt 0, Freight 1 images -->
  <input type="file" id="freight-0-1" multiple accept="image/*" />

  <!-- Receipt 1, Freight 0 images -->
  <input type="file" id="freight-1-0" multiple accept="image/*" />

  <button type="submit">Upload</button>
</form>
```

### Frontend - JavaScript

```javascript
// Batch data structure
const batchData = {
  receipts: [
    {
      receipt: {
        /* CREATE */
      },
      freightDetails: [
        { pieces: 20, type: "Box" }, // Index 0
        { pieces: 30, type: "Pallet" }, // Index 1
      ],
    },
    {
      receipt: { receiptId: 10 /* UPDATE */ },
      freightDetails: [
        { pieces: 10, type: "Crate" }, // Index 0
      ],
    },
  ],
};

// Build FormData
const formData = new FormData();
formData.append("batchData", JSON.stringify(batchData));

// Add images with proper field names
document.getElementById("freight-0-0").files.forEach((file, idx) => {
  formData.append(`freight-0-0-${idx}`, file);
});

document.getElementById("freight-0-1").files.forEach((file, idx) => {
  formData.append(`freight-0-1-${idx}`, file);
});

document.getElementById("freight-1-0").files.forEach((file, idx) => {
  formData.append(`freight-1-0-${idx}`, file);
});

// Send request
fetch("/api/warehouse-receipt/batch-with-images", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Backend Processing

1. **Multer** saves images to `uploads/freight-images/`
2. **imageHandler** maps uploaded files:
   - `freight-0-0-0` → receipts[0].freightDetails[0].images[0]
   - `freight-0-1-0` → receipts[0].freightDetails[1].images[0]
   - `freight-1-0-0` → receipts[1].freightDetails[0].images[0]
3. **Service** creates freight and image records atomically
4. **Database** stores:
   - Freight records in `Warehouse_Receipt_Freight_Info`
   - Image paths in `Warehouse_Receipt_Freight_Images`
5. **Response** includes complete receipt + freight + images

### Response

```json
{
  "success": true,
  "data": {
    "created": [
      {
        "receiptId": 20,
        "freightInfos": [
          {
            "freightId": 100,
            "pieces": 20,
            "images": [
              { "imagePath": "uploads/freight-images/image1-123456.jpg" }
            ]
          },
          {
            "freightId": 101,
            "pieces": 30,
            "images": [
              { "imagePath": "uploads/freight-images/image2-123457.jpg" }
            ]
          }
        ]
      }
    ],
    "updated": [
      {
        "receiptId": 10,
        "freightInfos": [
          {
            "freightId": 102,
            "pieces": 10,
            "images": [
              { "imagePath": "uploads/freight-images/image3-123458.jpg" }
            ]
          }
        ]
      }
    ],
    "totalCreated": 1,
    "totalUpdated": 1
  }
}
```

## Key Features

✅ **Atomic Transactions** - All receipts update/create or none do  
✅ **Image Mapping** - File field names automatically map to receipt/freight/image positions  
✅ **Validation** - Batch structure validated before processing  
✅ **Error Handling** - Rollback on any error, validation errors returned  
✅ **File Management** - Auto-cleanup, path storage, size limits  
✅ **Complete Data Return** - Response includes all freight with associated images  
✅ **Flexible** - Works with 0 to 100 images across multiple freight items  
✅ **Secure** - File type validation, size limits, JWT authentication

## File Structure

```
uploads/
├── freight-images/
│   ├── image-123456789.jpg
│   ├── receipt-image-987654321.png
│   └── photo-555555555.jpg
src/
├── config/
│   └── multer.ts (NEW)
├── controllers/
│   └── warehouse-receipt/
│       └── index.ts (UPDATED - added batchProcessWarehouseReceiptsWithImages)
├── database/
│   └── warehouse-receipt/
│       └── index.ts (UPDATED - added image functions)
├── routes/
│   └── warehouse-receipt/
│       └── index.ts (UPDATED - added /batch-with-images endpoint)
├── services/
│   └── warehouse-receipt/
│       ├── index.ts (UPDATED - image handling in all functions)
│       └── image-handler.ts (NEW)
└── docs/
    └── BATCH_UPLOAD_WITH_IMAGES.md (NEW)
```

## Usage

See `BATCH_UPLOAD_WITH_IMAGES.md` for:

- Complete JavaScript examples
- React component example
- cURL examples
- Request/response formats
- Constraints and limits
