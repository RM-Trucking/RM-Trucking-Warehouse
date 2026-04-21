# Image Upload in Swagger - Complete Guide

## Overview

Images are uploaded through the **`POST /api/warehouse-receipt/batch`** endpoint using multipart/form-data. The system automatically maps images to the correct freight items using a naming convention.

## How to Upload in Swagger

### Step 1: Open Swagger UI

- Navigate to: `http://localhost:5000/api-docs` (or your Swagger URL)
- Find **POST /api/warehouse-receipt/batch**
- Expand the endpoint

### Step 2: Select Request Body Type

- Select **multipart/form-data** from the content-type dropdown
- This allows you to upload both JSON data AND files

### Step 3: Fill in the Batch Data Field

1. Click on the **batchData** field (text textarea)
2. Copy and paste your JSON structure (DO NOT include images in JSON):

```json
{
  "receipts": [
    {
      "receipt": {
        "receiptNumber": 100000015,
        "shipper": "ABC Logistics Inc",
        "customerId": 5,
        "stationId": 3,
        "verificationId": 100000021,
        "carrierId": 2,
        "piecesInland": 50,
        "weightInland": 5000,
        "status": "INITIATE"
      },
      "freightDetails": [
        {
          "pieces": 20,
          "type": "Box",
          "weight": 2000
        },
        {
          "pieces": 30,
          "type": "Pallet",
          "weight": 3000
        }
      ]
    }
  ]
}
```

### Step 4: Upload Images

For each image you want to attach, click **Add file** and:

1. **Select the image file** from your computer
2. **Set the field name** using the pattern: `freight-{receiptIndex}-{freightIndex}-{imageIndex}`

**Examples:**

**For receipts[0].freightDetails[0]** (Box - 20 pieces):

- First image: field name = `freight-0-0-0`
- Second image: field name = `freight-0-0-1`
- Third image: field name = `freight-0-0-2`

**For receipts[0].freightDetails[1]** (Pallet - 30 pieces):

- First image: field name = `freight-0-1-0`
- Second image: field name = `freight-0-1-1`

**For receipts[1].freightDetails[0]** (if you have a second receipt):

- First image: field name = `freight-1-0-0`

### Step 5: Add Authorization

1. Click the lock icon in the endpoint header
2. Paste your JWT token in the **Authorization** field
3. Format: `Bearer YOUR_TOKEN_HERE`

### Step 6: Execute

Click **Execute** button to submit

## Field Naming Convention Explained

The field name tells the system where to store the image:

```
freight-{receiptIndex}-{freightIndex}-{imageIndex}
         ├─ receiptIndex: which receipt (0 = first receipt)
         ├─ freightIndex: which freight item within that receipt (0 = first freight)
         └─ imageIndex: which image for that freight (0 = first image, 1 = second, etc.)
```

**Visual Example:**

```
receipts array:
  [0] Receipt #100000015
      ├─ freightDetails[0] (Box - 20 pieces)
      │  ├─ Image freight-0-0-0 ✓ (stored here)
      │  ├─ Image freight-0-0-1 ✓ (stored here)
      │  └─ Image freight-0-0-2 ✓ (stored here)
      │
      └─ freightDetails[1] (Pallet - 30 pieces)
         ├─ Image freight-0-1-0 ✓ (stored here)
         └─ Image freight-0-1-1 ✓ (stored here)

  [1] Receipt #100000016
      └─ freightDetails[0] (Crate - 10 pieces)
         └─ Image freight-1-0-0 ✓ (stored here)
```

## Complete Request Example in Swagger

**Step-by-step in Swagger UI:**

1. **batchData field** (paste as text):

```json
{
  "receipts": [
    {
      "receipt": {
        "receiptNumber": 100000015,
        "shipper": "ABC Logistics Inc",
        "customerId": 5,
        "stationId": 3,
        "verificationId": 100000021,
        "carrierId": 2,
        "status": "INITIATE"
      },
      "freightDetails": [
        { "pieces": 20, "type": "Box", "weight": 2000 },
        { "pieces": 30, "type": "Pallet", "weight": 3000 }
      ]
    }
  ]
}
```

2. **Add file uploads** (click "Add file" multiple times):
   - File: box_image1.jpg → Field: `freight-0-0-0`
   - File: box_image2.jpg → Field: `freight-0-0-1`
   - File: pallet_image1.jpg → Field: `freight-0-1-0`

## How Images Are Stored (Backend Flow)

### 1. **Image Mapping** (image-handler.ts)

```
Uploaded Files:
  freight-0-0-0 → box_image1.jpg → stored as uploads/freight-images/box_image1-1649000000.jpg
  freight-0-0-1 → box_image2.jpg → stored as uploads/freight-images/box_image2-1649000001.jpg
  freight-0-1-0 → pallet_image1.jpg → stored as uploads/freight-images/pallet_image1-1649000002.jpg

These files are mapped to the freight details array:
  receipts[0].freightDetails[0].images = [
    "uploads/freight-images/box_image1-1649000000.jpg",
    "uploads/freight-images/box_image2-1649000001.jpg"
  ]

  receipts[0].freightDetails[1].images = [
    "uploads/freight-images/pallet_image1-1649000002.jpg"
  ]
```

### 2. **Service Layer Processing** (warehouse-receipt/index.ts)

```
For each freight item:
  1. Extract images array from freight object
  2. Create freight record in database
  3. For each image path:
     - Create record in Warehouse_Receipt_Freight_Images table
     - Link to freight via freightId
     - Store path, uploadedAt timestamp
```

### 3. **Database Storage**

```
Warehouse_Receipt_Freight_Info table:
  freightId: 123
  receiptId: 10
  pieces: 20
  type: Box
  weight: 2000

Warehouse_Receipt_Freight_Images table:
  imageId: 456
  freightId: 123 ← Links back to freight item
  imagePath: uploads/freight-images/box_image1-1649000000.jpg
  uploadedAt: 2026-04-20T10:30:00Z

Warehouse_Receipt_Freight_Images table:
  imageId: 457
  freightId: 123 ← Same freight, different image
  imagePath: uploads/freight-images/box_image2-1649000001.jpg
  uploadedAt: 2026-04-20T10:30:01Z
```

### 4. **Response Includes Complete Data**

```json
{
  "success": true,
  "filesProcessed": 3,
  "data": {
    "created": [
      {
        "receiptId": 10,
        "receiptNumber": 100000015,
        "freightInfos": [
          {
            "freightId": 123,
            "pieces": 20,
            "type": "Box",
            "images": [
              {
                "imageId": 456,
                "freightId": 123,
                "imagePath": "uploads/freight-images/box_image1-1649000000.jpg",
                "uploadedAt": "2026-04-20T10:30:00Z"
              },
              {
                "imageId": 457,
                "freightId": 123,
                "imagePath": "uploads/freight-images/box_image2-1649000001.jpg",
                "uploadedAt": "2026-04-20T10:30:01Z"
              }
            ]
          },
          {
            "freightId": 124,
            "pieces": 30,
            "type": "Pallet",
            "images": [
              {
                "imageId": 458,
                "freightId": 124,
                "imagePath": "uploads/freight-images/pallet_image1-1649000002.jpg",
                "uploadedAt": "2026-04-20T10:30:02Z"
              }
            ]
          }
        ]
      }
    ],
    "totalCreated": 1
  }
}
```

## Verification Steps

### 1. **In Swagger Response**

- ✓ Check `filesProcessed` count matches number of uploaded files
- ✓ Verify each `freightInfos[].images` array has correct number of images
- ✓ Confirm `imagePath` shows unique filenames with timestamps
- ✓ Check freightId links match between freightInfos and images

### 2. **In File System**

```bash
# List uploaded images
ls uploads/freight-images/
# Output should show files like:
# box_image1-1649000000.jpg
# box_image2-1649000001.jpg
# pallet_image1-1649000002.jpg
```

### 3. **In Database**

```sql
-- Query freight images
SELECT fi.freightId, fi.pieces, fi.type, COUNT(img.imageId) as image_count
FROM Warehouse_Receipt_Freight_Info fi
LEFT JOIN Warehouse_Receipt_Freight_Images img ON fi.freightId = img.freightId
WHERE fi.receiptId = 10
GROUP BY fi.freightId, fi.pieces, fi.type;

-- Expected output:
-- freightId: 123, pieces: 20, type: Box, image_count: 2
-- freightId: 124, pieces: 30, type: Pallet, image_count: 1
```

### 4. **Query Specific Freight Images**

```sql
SELECT * FROM Warehouse_Receipt_Freight_Images
WHERE freightId = 123;

-- Shows all images for that specific freight item
```

## Common Mistakes & Solutions

### ❌ Mistake 1: Wrong Field Names

```
Wrong: image1, photo, file
Correct: freight-0-0-0, freight-0-0-1, freight-0-1-0
```

### ❌ Mistake 2: Including Images in JSON

```
Wrong:
{
  "freightDetails": [
    {
      "pieces": 20,
      "images": [{ raw binary data }]  ❌
    }
  ]
}

Correct:
{
  "freightDetails": [
    {
      "pieces": 20
      // Images uploaded separately with field names
    }
  ]
}
```

### ❌ Mistake 3: Wrong Index Numbers

```
Wrong sequence: freight-0-0-0, freight-0-0-2 (skips 1)
Correct sequence: freight-0-0-0, freight-0-0-1, freight-0-0-2

Wrong receipt index: freight-2-0-0 when you only have 2 receipts (0,1)
Correct: freight-0-0-0, freight-1-0-0
```

### ❌ Mistake 4: Auth Token

```
Wrong: "Authorization": "YOUR_TOKEN"
Correct: "Authorization": "Bearer YOUR_TOKEN"
        (must include "Bearer" prefix)
```

## Troubleshooting

### Images not appearing in response

1. ✓ Check field names follow pattern: `freight-{receiptIndex}-{freightIndex}-{imageIndex}`
2. ✓ Verify indices match your receipt/freight structure
3. ✓ Check logs for `processinguploadedfile` messages
4. ✓ Ensure files are valid image formats (JPEG, PNG, GIF, WebP)

### Files uploaded but not linked to correct freight

1. ✓ Verify field names in Swagger
2. ✓ Check `filesProcessed` count in response
3. ✓ Look at `freightId` in returned images array
4. ✓ Query database to verify freightId relationships

### File size errors

- Max 10MB per file
- Max 100 files per request
- Total upload should stay reasonable

## API Response Examples

### Success with Images

```json
{
  "success": true,
  "message": "Batch process completed successfully",
  "filesProcessed": 3,
  "data": {
    "created": [{...}],
    "updated": [],
    "totalCreated": 1,
    "totalUpdated": 0
  }
}
```

### Success without Images

```json
{
  "success": true,
  "message": "Batch process completed successfully",
  "data": {
    "created": [{...}],
    "updated": [],
    "totalCreated": 1,
    "totalUpdated": 0
  }
}
// Note: filesProcessed field NOT present when no images uploaded
```

### Error - Wrong Field Name

```json
{
  "success": true,
  "filesProcessed": 2,
  "data": {
    "created": [
      {
        "freightInfos": [
          {
            "freightId": 123,
            "images": [] // Empty - field name didn't match pattern
          }
        ]
      }
    ]
  }
}
```

## Summary

✅ **Upload in Swagger**: Use multipart/form-data mode  
✅ **Field Naming**: Follow pattern `freight-{receiptIdx}-{freightIdx}-{imageIdx}`  
✅ **Correct Storage**: Images automatically mapped and stored by freight item  
✅ **Verification**: Check response includes freightId links and filePaths  
✅ **Database**: Images stored in Warehouse_Receipt_Freight_Images linked to freightId
