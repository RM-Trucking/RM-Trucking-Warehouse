# Batch Warehouse Receipt Upload with Images

## Overview

The `/warehouse-receipt/batch-with-images` endpoint handles batch processing of warehouse receipts with image uploads using multipart/form-data.

## Endpoint Details

- **URL**: `POST /api/warehouse-receipt/batch-with-images`
- **Authentication**: JWT Bearer token required
- **Content-Type**: `multipart/form-data`

## Request Format

### Form Fields

1. **batchData** (required): JSON string containing the batch structure

   ```json
   {
     "receipts": [
       {
         "receipt": {
           /* receipt data */
         },
         "freightDetails": [
           {
             /* freight data without images */
           }
         ]
       }
     ]
   }
   ```

2. **Image Files** (optional): Multiple files with naming convention:
   - Field name format: `freight-{receiptIndex}-{freightIndex}-{imageIndex}`
   - Examples:
     - `freight-0-0-0` → receipts[0].freightDetails[0].images[0]
     - `freight-0-0-1` → receipts[0].freightDetails[0].images[1]
     - `freight-0-1-0` → receipts[0].freightDetails[1].images[0]

## Example: JavaScript/Fetch

```javascript
const batchData = {
  receipts: [
    {
      receipt: {
        receiptNumber: 100000015,
        shipper: "ABC Logistics Inc",
        customerId: 5,
        stationId: 3,
        carrierId: 2,
        receivedBy: "John Doe",
        status: "INITIATE",
      },
      freightDetails: [
        {
          pieces: 20,
          type: "Box",
          weight: 2000,
          length: 100,
          width: 80,
          height: 60,
        },
        {
          pieces: 30,
          type: "Pallet",
          weight: 3000,
        },
      ],
    },
    {
      receipt: {
        receiptId: 10,
        receiptNumber: 100000016,
        shipper: "Global Freight Ltd",
        customerId: 5,
        stationId: 3,
        receivedBy: "Jane Smith",
      },
      freightDetails: [
        {
          pieces: 10,
          type: "Crate",
          weight: 1200,
        },
      ],
    },
  ],
};

// Create FormData
const formData = new FormData();
formData.append("batchData", JSON.stringify(batchData));

// Add images
// For receipts[0].freightDetails[0]
const images0 = document.getElementById("freight-0-0-images").files;
for (let i = 0; i < images0.length; i++) {
  formData.append(`freight-0-0-${i}`, images0[i]);
}

// For receipts[0].freightDetails[1]
const images1 = document.getElementById("freight-0-1-images").files;
for (let i = 0; i < images1.length; i++) {
  formData.append(`freight-0-1-${i}`, images1[i]);
}

// For receipts[1].freightDetails[0]
const images2 = document.getElementById("freight-1-0-images").files;
for (let i = 0; i < images2.length; i++) {
  formData.append(`freight-1-0-${i}`, images2[i]);
}

// Send request
const response = await fetch("/api/warehouse-receipt/batch-with-images", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result);
```

## Example: React Component

```jsx
import React, { useState } from "react";

export function BatchReceiptUpload() {
  const [receipts, setReceipts] = useState([]);
  const [imageMap, setImageMap] = useState({});

  const handleReceiptChange = (index, field, value) => {
    const updated = [...receipts];
    updated[index].receipt[field] = value;
    setReceipts(updated);
  };

  const handleFreightChange = (receiptIdx, freightIdx, field, value) => {
    const updated = [...receipts];
    updated[receiptIdx].freightDetails[freightIdx][field] = value;
    setReceipts(updated);
  };

  const handleImageChange = (receiptIdx, freightIdx, files) => {
    const key = `${receiptIdx}-${freightIdx}`;
    setImageMap({ ...imageMap, [key]: files });
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("batchData", JSON.stringify(receipts));

    // Add images with proper field names
    Object.entries(imageMap).forEach(([key, files]) => {
      const [receiptIdx, freightIdx] = key.split("-");
      Array.from(files).forEach((file, idx) => {
        formData.append(`freight-${receiptIdx}-${freightIdx}-${idx}`, file);
      });
    });

    try {
      const response = await fetch("/api/warehouse-receipt/batch-with-images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        console.log("Upload successful:", result.data);
      } else {
        console.error("Upload failed:", result.errors);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      {/* Render your form here */}
      <button onClick={handleSubmit}>Upload Batch</button>
    </div>
  );
}
```

## Example: cURL

```bash
curl -X POST http://localhost:5000/api/warehouse-receipt/batch-with-images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'batchData={"receipts":[{"receipt":{"receiptNumber":100000015,"shipper":"ABC Logistics"},"freightDetails":[{"pieces":20,"type":"Box","weight":2000}]}]}' \
  -F "freight-0-0-0=@/path/to/image1.jpg" \
  -F "freight-0-0-1=@/path/to/image2.jpg"
```

## Response Format

### Success Response (201)

```json
{
  "success": true,
  "message": "Batch process with images completed successfully",
  "filesProcessed": 3,
  "data": {
    "updated": [
      {
        "receiptId": 10,
        "receiptNumber": 100000015,
        "shipper": "ABC Logistics Inc",
        "freightInfos": [
          {
            "freightId": 123,
            "pieces": 20,
            "type": "Box",
            "images": [
              {
                "imageId": 456,
                "imagePath": "uploads/freight-images/image1-1649000000000.jpg",
                "uploadedAt": "2024-04-07T10:30:00Z"
              }
            ]
          }
        ]
      }
    ],
    "created": [
      {
        "receiptId": 15,
        "receiptNumber": 100000016,
        "shipper": "Global Freight Ltd",
        "freightInfos": [
          {
            "freightId": 124,
            "pieces": 10,
            "type": "Crate",
            "images": []
          }
        ]
      }
    ],
    "totalUpdated": 1,
    "totalCreated": 1
  }
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["List of validation errors"]
}
```

## Image Upload Constraints

- **Allowed formats**: JPEG, PNG, GIF, WebP
- **Max file size**: 10 MB per image
- **Max files**: 100 files per request
- **Storage location**: `uploads/freight-images/`

## File Naming Convention

Uploaded files are renamed automatically in format: `{originalName}-{timestamp}.{ext}`

Example: `receipt-image.jpg` → `receipt-image-1649000000000.jpg`

## Database Storage

Image paths are stored in the `Warehouse_Receipt_Freight_Images` table with:

- `freightId`: Reference to freight item
- `imagePath`: Relative path to stored image
- `uploadedAt`: Timestamp of upload
