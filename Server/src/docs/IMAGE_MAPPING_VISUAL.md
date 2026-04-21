# Image Upload Mapping - Visual Reference

## Quick Reference Chart

### Scenario: Single Receipt with 2 Freight Items

```
POST /api/warehouse-receipt/batch (multipart/form-data)

┌─────────────────────────────────────────────────────┐
│ FORM DATA                                           │
├─────────────────────────────────────────────────────┤
│ Field: batchData (JSON Text)                        │
│ {                                                   │
│   "receipts": [                                     │
│     {                                               │
│       "receipt": {...},                             │
│       "freightDetails": [                           │
│         { "pieces": 20, "type": "Box" },            │
│         { "pieces": 30, "type": "Pallet" }          │
│       ]                                             │
│     }                                               │
│   ]                                                 │
│ }                                                   │
│                                                     │
│ Files to upload:                                    │
│ ┌────────────────────────┬──────────────────────┐  │
│ │ Field Name             │ File                 │  │
│ ├────────────────────────┼──────────────────────┤  │
│ │ freight-0-0-0          │ box_photo1.jpg       │  │
│ │ freight-0-0-1          │ box_photo2.jpg       │  │
│ │ freight-0-1-0          │ pallet_photo1.jpg    │  │
│ └────────────────────────┴──────────────────────┘  │
└─────────────────────────────────────────────────────┘

         ↓ (Backend Processing)

┌──────────────────────────────────────────────────────────────────┐
│ IMAGE HANDLER: processUploadedImages()                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Creates file map:                                                │
│  {                                                               │
│    "freight-0-0-0": "uploads/freight-images/box_photo1-xxx.jpg" │
│    "freight-0-0-1": "uploads/freight-images/box_photo2-xxx.jpg" │
│    "freight-0-1-0": "uploads/freight-images/pallet_photo1-xxx.jpg"
│  }                                                               │
│                                                                  │
│ Iterates receipts array:                                         │
│  for each receipt (receiptIndex):                               │
│    for each freight (freightIndex):                             │
│      for imageIndex 0, 1, 2, ...:                               │
│        lookup: freight-{receiptIndex}-{freightIndex}-{imageIndex}
│        add to freight.images array                              │
│                                                                  │
│ Result:                                                          │
│  receipts[0].freightDetails[0].images = [                        │
│    "uploads/freight-images/box_photo1-xxx.jpg",                │
│    "uploads/freight-images/box_photo2-xxx.jpg"                 │
│  ]                                                               │
│                                                                  │
│  receipts[0].freightDetails[1].images = [                        │
│    "uploads/freight-images/pallet_photo1-xxx.jpg"              │
│  ]                                                               │
└──────────────────────────────────────────────────────────────────┘

         ↓ (Service Layer)

┌──────────────────────────────────────────────────────────────────┐
│ SERVICE LAYER: batchProcessWarehouseReceiptsService()            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ For each receipt:                                                │
│   Create warehouse_receipt → receiptId: 10                       │
│                                                                  │
│   For each freight in freightDetails:                            │
│     Create freight_info → freightId: 123  (for Box)            │
│     Create freight_info → freightId: 124  (for Pallet)         │
│                                                                  │
│     For each image path in freight.images:                       │
│       Create freight_image with:                                │
│         - freightId: 123 (for Box images)                      │
│         - imagePath: uploads/freight-images/box_photo1-xxx.jpg │
│         - imageId: 456 (auto-increment)                         │
│                                                                  │
│       Create freight_image with:                                │
│         - freightId: 123 (for Box images)                      │
│         - imagePath: uploads/freight-images/box_photo2-xxx.jpg │
│         - imageId: 457 (auto-increment)                         │
│                                                                  │
│       Create freight_image with:                                │
│         - freightId: 124 (for Pallet images)                  │
│         - imagePath: uploads/freight-images/pallet_photo1-xxx.jpg
│         - imageId: 458 (auto-increment)                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

         ↓ (Database)

┌───────────────────────────────────────────────────────────────────────┐
│ DATABASE TABLES                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Warehouse_Receipt:                                                    │
│  receiptId: 10                                                        │
│  receiptNumber: 100000015                                             │
│  shipper: ABC Logistics Inc                                           │
│                                                                       │
│ Warehouse_Receipt_Freight_Info:                                       │
│  ┌──────────┬─────────┬────────┬────────┐                             │
│  │freightId │receiptId│pieces  │type    │                             │
│  ├──────────┼─────────┼────────┼────────┤                             │
│  │123       │10       │20      │Box     │                             │
│  │124       │10       │30      │Pallet  │                             │
│  └──────────┴─────────┴────────┴────────┘                             │
│                                                                       │
│ Warehouse_Receipt_Freight_Images:                                     │
│  ┌─────────┬──────────┬──────────────────────────────────────────┐   │
│  │imageId  │freightId │imagePath                                 │   │
│  ├─────────┼──────────┼──────────────────────────────────────────┤   │
│  │456      │123       │uploads/freight-images/box_photo1-xxx.jpg │   │
│  │457      │123       │uploads/freight-images/box_photo2-xxx.jpg │   │
│  │458      │124       │uploads/freight-images/pallet_photo1-xxx.jpg
│  └─────────┴──────────┴──────────────────────────────────────────┘   │
│                           ↑                                           │
│               All linked via freightId!                               │
└───────────────────────────────────────────────────────────────────────┘

         ↓ (Response)

┌──────────────────────────────────────────────────────────────────┐
│ API RESPONSE (202 Created)                                       │
├──────────────────────────────────────────────────────────────────┤
│ {                                                                │
│   "success": true,                                               │
│   "filesProcessed": 3,                                           │
│   "data": {                                                      │
│     "created": [                                                 │
│       {                                                          │
│         "receiptId": 10,                                         │
│         "receiptNumber": 100000015,                              │
│         "freightInfos": [                                        │
│           {                                                      │
│             "freightId": 123,  ← KEY LINK                        │
│             "pieces": 20,                                        │
│             "type": "Box",                                       │
│             "images": [                                          │
│               {                                                  │
│                 "imageId": 456,                                  │
│                 "freightId": 123,  ← MATCHES!                   │
│                 "imagePath": "uploads/freight-images/box_photo1-xxx.jpg"
│               },                                                 │
│               {                                                  │
│                 "imageId": 457,                                  │
│                 "freightId": 123,  ← MATCHES!                   │
│                 "imagePath": "uploads/freight-images/box_photo2-xxx.jpg"
│               }                                                  │
│             ]                                                    │
│           },                                                     │
│           {                                                      │
│             "freightId": 124,  ← KEY LINK                        │
│             "pieces": 30,                                        │
│             "type": "Pallet",                                    │
│             "images": [                                          │
│               {                                                  │
│                 "imageId": 458,                                  │
│                 "freightId": 124,  ← MATCHES!                   │
│                 "imagePath": "uploads/freight-images/pallet_photo1-xxx.jpg"
│               }                                                  │
│             ]                                                    │
│           }                                                      │
│         ]                                                        │
│       }                                                          │
│     ]                                                            │
│   }                                                              │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

## Field Name Formula

```
freight-{receiptIndex}-{freightIndex}-{imageIndex}

Where:
  receiptIndex = which receipt (0 = 1st, 1 = 2nd, etc.)
  freightIndex = which freight in that receipt (0 = 1st, 1 = 2nd, etc.)
  imageIndex   = which image for that freight (0 = 1st, 1 = 2nd, etc.)
```

## Examples

### Example 1: Single Receipt, Single Freight, Multiple Images

```
Receipt Structure:
  receipts[0]
    └─ freightDetails[0] ← Upload here

Field names:
  freight-0-0-0  (1st image)
  freight-0-0-1  (2nd image)
  freight-0-0-2  (3rd image)
```

### Example 2: Single Receipt, Multiple Freight, Multiple Images

```
Receipt Structure:
  receipts[0]
    ├─ freightDetails[0] (Box)      ← Upload here
    ├─ freightDetails[1] (Pallet)   ← Upload here
    └─ freightDetails[2] (Skid)     ← Upload here

Field names:
  freight-0-0-0  (1st image for Box)
  freight-0-0-1  (2nd image for Box)
  freight-0-1-0  (1st image for Pallet)
  freight-0-2-0  (1st image for Skid)
```

### Example 3: Multiple Receipts, Each with Multiple Freight

```
Receipt Structure:
  receipts[0]
    ├─ freightDetails[0] (Box)      ← freight-0-0-0
    └─ freightDetails[1] (Pallet)   ← freight-0-1-0

  receipts[1]
    ├─ freightDetails[0] (Crate)    ← freight-1-0-0
    └─ freightDetails[1] (Skid)     ← freight-1-1-0

Field names:
  freight-0-0-0  (Box images)
  freight-0-0-1
  freight-0-1-0  (Pallet images)
  freight-1-0-0  (Crate images)
  freight-1-1-0  (Skid images)
```

## Database Linking Verification

Query to verify images are stored correctly:

```sql
SELECT
  r.receiptNumber,
  f.freightId,
  f.pieces,
  f.type,
  COUNT(img.imageId) as image_count,
  STRING_AGG(img.imagePath, ', ') as image_paths
FROM Warehouse_Receipt r
LEFT JOIN Warehouse_Receipt_Freight_Info f ON r.receiptId = f.receiptId
LEFT JOIN Warehouse_Receipt_Freight_Images img ON f.freightId = img.freightId
GROUP BY r.receiptNumber, f.freightId, f.pieces, f.type
ORDER BY r.receiptNumber, f.freightId;
```

Expected output:

```
┌────────────────┬──────────┬────────┬────────┬──────────────┐
│receiptNumber   │freightId │pieces  │type    │image_count   │
├────────────────┼──────────┼────────┼────────┼──────────────┤
│100000015       │123       │20      │Box     │2             │
│100000015       │124       │30      │Pallet  │1             │
│100000016       │125       │10      │Crate   │0             │
└────────────────┴──────────┴────────┴────────┴──────────────┘
```

This shows:

- Box freight (123) has 2 images linked to it
- Pallet freight (124) has 1 image linked to it
- Crate freight (125) has 0 images

## Data Flow Summary

```
1. USER UPLOADS IN SWAGGER
   freight-0-0-0 = image1.jpg
   freight-0-0-1 = image2.jpg
   freight-0-1-0 = image3.jpg

2. BACKEND RECEIVES FILES
   req.files = [
     { fieldname: 'freight-0-0-0', filename: 'image1-123456.jpg', path: '/uploads/...' },
     { fieldname: 'freight-0-0-1', filename: 'image2-123457.jpg', path: '/uploads/...' },
     { fieldname: 'freight-0-1-0', filename: 'image3-123458.jpg', path: '/uploads/...' }
   ]

3. IMAGE HANDLER MAPS
   freight-0-0-0 → receipts[0].freightDetails[0].images[0]
   freight-0-0-1 → receipts[0].freightDetails[0].images[1]
   freight-0-1-0 → receipts[0].freightDetails[1].images[0]

4. SERVICE CREATES RECORDS
   For receipts[0].freightDetails[0]:
     - Create Freight → freightId: 123
     - Create Image → freightId: 123, path: uploads/.../image1-123456.jpg
     - Create Image → freightId: 123, path: uploads/.../image2-123457.jpg

   For receipts[0].freightDetails[1]:
     - Create Freight → freightId: 124
     - Create Image → freightId: 124, path: uploads/.../image3-123458.jpg

5. DATABASE RESULT
   Freight 123 has 2 images
   Freight 124 has 1 image
   All correctly linked!
```

## Testing the Mapping

```javascript
// Frontend: How to build correct field names programmatically

const receipts = [
  {
    receipt: {...},
    freightDetails: [
      {pieces: 20, type: 'Box'},      // receiptIndex=0, freightIndex=0
      {pieces: 30, type: 'Pallet'}    // receiptIndex=0, freightIndex=1
    ]
  }
];

const formData = new FormData();

// Add batch data
formData.append('batchData', JSON.stringify({receipts}));

// Add images with correct field names
receipts.forEach((receipt, receiptIdx) => {
  receipt.freightDetails.forEach((freight, freightIdx) => {
    const imageInput = document.getElementById(`images-${receiptIdx}-${freightIdx}`);
    if (imageInput?.files?.length) {
      Array.from(imageInput.files).forEach((file, imgIdx) => {
        const fieldName = `freight-${receiptIdx}-${freightIdx}-${imgIdx}`;
        formData.append(fieldName, file);
        console.log(`Added image: ${fieldName} → ${file.name}`);
      });
    }
  });
});

// Send
fetch('/api/warehouse-receipt/batch', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' },
  body: formData
});
```
