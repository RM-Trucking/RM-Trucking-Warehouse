# Edit Warehouse Receipt API - Quick Reference

## Endpoint

```
PUT /api/warehouse-receipt/{receiptId}
Authorization: Bearer {token}
```

---

## Mode 1: Traditional File Upload

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer eyJ..." \
  -F "receipt={\"location\":\"Warehouse B\",\"status\":\"ON_HAND\",\"updatedBy\":1}" \
  -F "freight-0-0=@/path/to/image1.jpg" \
  -F "freight-0-1=@/path/to/image2.jpg" \
  -F "bad-freight-image-0=@/path/to/damage.jpg"
```

### JavaScript/Node.js Example

```javascript
const FormData = require("form-data");
const fs = require("fs");

const form = new FormData();
form.append(
  "receipt",
  JSON.stringify({
    location: "Warehouse B",
    status: "ON_HAND",
    updatedBy: 1,
  }),
);
form.append("freight-0-0", fs.createReadStream("/path/to/image1.jpg"));
form.append("freight-0-1", fs.createReadStream("/path/to/image2.jpg"));
form.append("bad-freight-image-0", fs.createReadStream("/path/to/damage.jpg"));

const response = await fetch(
  "http://localhost:5000/api/warehouse-receipt/123",
  {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      ...form.getHeaders(),
    },
    body: form,
  },
);
```

### Postman Example

1. Set request to **PUT** `/api/warehouse-receipt/123`
2. Go to **Body** tab → **form-data**
3. Add fields:
   - `receipt` (text): `{"location":"Warehouse B","status":"ON_HAND","updatedBy":1}`
   - `freight-0-0` (file): Select image1.jpg
   - `freight-0-1` (file): Select image2.jpg
   - `bad-freight-image-0` (file): Select damage.jpg
4. Go to **Headers** tab
5. Add: `Authorization: Bearer {token}`

---

## Mode 2: Base64 Strings (JSON Body)

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "location": "Warehouse B",
    "status": "ON_HAND",
    "updatedBy": 1,
    "freight-0-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAA...",
    "freight-0-1": "base64,/9j/4AAQSkZJRgABAgAAZABkAAA...",
    "bad-freight-image-0": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAA..."
  }'
```

### JavaScript/Node.js Example

```javascript
const response = await fetch(
  "http://localhost:5000/api/warehouse-receipt/123",
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      location: "Warehouse B",
      status: "ON_HAND",
      updatedBy: 1,
      "freight-0-0": "data:image/jpeg;base64," + base64String1,
      "freight-0-1": "base64," + base64String2,
      "bad-freight-image-0": "data:image/png;base64," + base64String3,
    }),
  },
);

const result = await response.json();
console.log(result);
```

### Postman Example

1. Set request to **PUT** `/api/warehouse-receipt/123`
2. Go to **Body** tab → **raw** → **JSON**
3. Paste JSON with Base64 fields
4. Add header: `Authorization: Bearer {token}`

---

## Mode 3: Hybrid (Files + Base64)

### cURL Example

```bash
curl -X PUT http://localhost:5000/api/warehouse-receipt/123 \
  -H "Authorization: Bearer eyJ..." \
  -F "receipt={\"location\":\"Warehouse B\",\"updatedBy\":1}" \
  -F "freight-0-0=@/path/to/image1.jpg" \
  -F "freight-0-1=data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." \
  -F "bad-freight-image-0=@/path/to/damage.jpg"
```

---

## Complete Request/Response Examples

### Request: Update Receipt with Freight Items and Images

```json
PUT /api/warehouse-receipt/123
Authorization: Bearer token
Content-Type: multipart/form-data

{
  "receipt": {
    "location": "Warehouse B, Zone 2",
    "status": "ON_HAND",
    "piecesInland": 20,
    "updatedBy": 1,
    "freightDetails": [
      {
        "freightId": 456,
        "pieces": 10,
        "type": "Pallet",
        "length": 100,
        "width": 80,
        "height": 120
      },
      {
        "pieces": 5,
        "type": "Box",
        "length": 50,
        "width": 40,
        "height": 30
      }
    ],
    "removeFreightIds": [789],
    "removeBadFreightImagePaths": ["uploads/bad-freight/old-damage.jpg"]
  },
  "freight-0-0": [file: image1.jpg],
  "freight-0-1": [file: image2.jpg],
  "freight-1-0": [file: box-image.jpg],
  "bad-freight-image-0": [file: damage.jpg]
}
```

### Response: Success

```json
{
  "success": true,
  "message": "Receipt updated successfully",
  "data": {
    "receiptId": "123",
    "receiptNumber": "REC-2024-001",
    "receiptDate": "2024-01-15T10:30:00Z",
    "location": "Warehouse B, Zone 2",
    "status": "ON_HAND",
    "piecesInland": 20,
    "freightDetails": [
      {
        "freightId": 456,
        "pieces": 10,
        "type": "Pallet",
        "length": 100,
        "width": 80,
        "height": 120,
        "images": ["uploads/freight/image1.jpg", "uploads/freight/image2.jpg"]
      },
      {
        "freightId": 999,
        "pieces": 5,
        "type": "Box",
        "length": 50,
        "width": 40,
        "height": 30,
        "images": ["uploads/freight/box-image.jpg"]
      }
    ],
    "badFreightImages": ["uploads/bad-freight/damage.jpg"],
    "updatedBy": 1,
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

### Response: Error

```json
{
  "success": false,
  "message": "Receipt not found"
}
```

---

## Update Operations

### Update Receipt Fields Only

```json
{
  "location": "New Location",
  "status": "PICKED_UP",
  "piecesInland": 25
}
```

### Add Freight Items

```json
{
  "freightDetails": [
    {
      "pieces": 10,
      "type": "Pallet",
      "length": 100,
      "width": 80,
      "height": 120,
      "weight": 500,
      "cubicMeter": 0.96
    }
  ]
}
```

### Update Existing Freight Item (with freightId)

```json
{
  "freightDetails": [
    {
      "freightId": 456,
      "pieces": 15,
      "type": "Pallet",
      "removeImagePaths": ["uploads/freight/old-image.jpg"]
    }
  ]
}
```

### Delete Freight Items

```json
{
  "removeFreightIds": [456, 789]
}
```

### Delete Images

```json
{
  "removeBadFreightImagePaths": [
    "uploads/bad-freight/old-damage.jpg",
    "uploads/bad-freight/another-image.jpg"
  ]
}
```

### Complex Update (All Operations)

```json
{
  "location": "New Location",
  "status": "ON_HAND",
  "piecesInland": 30,
  "updatedBy": 2,
  "freightDetails": [
    {
      "freightId": 456,
      "pieces": 20,
      "removeImagePaths": ["uploads/freight/old.jpg"]
    },
    {
      "pieces": 10,
      "type": "Box"
    }
  ],
  "removeFreightIds": [789, 790],
  "badFreightImages": ["uploads/bad-freight/damage.jpg"],
  "removeBadFreightImagePaths": ["uploads/bad-freight/resolved.jpg"]
}
```

---

## Field Naming Rules

### Freight Image Fields

- Format: `freight-{freightIndex}-{imageIndex}`
- Example: `freight-0-0`, `freight-0-1`, `freight-1-0`
- Index starts at 0
- Can be file OR Base64 string
- Multiple images per freight item supported

### Bad Freight Image Fields

- Format: `bad-freight-image-{index}`
- Example: `bad-freight-image-0`, `bad-freight-image-1`
- Index starts at 0
- Can be file OR Base64 string
- Multiple bad freight images supported

---

## Content Types

### For File Uploads

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

### For Base64 Strings

```
Content-Type: application/json
```

### For Hybrid

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

---

## Status Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 200  | Receipt updated successfully                  |
| 400  | Bad request (invalid payload, missing fields) |
| 401  | Unauthorized (missing or invalid token)       |
| 404  | Receipt not found                             |
| 500  | Server error                                  |

---

## Common Errors

### "Receipt ID is required"

- Cause: Missing `receiptId` in URL path
- Fix: Ensure URL is `/api/warehouse-receipt/{receiptId}`

### "Receipt not found"

- Cause: Receipt with given ID doesn't exist
- Fix: Verify receipt ID is correct

### Invalid JSON in form field

- Cause: Malformed JSON string in multipart field
- Fix: Ensure JSON is properly escaped and formatted

### Base64 conversion failed

- Cause: Invalid Base64 string
- Fix: Ensure Base64 starts with `data:image/` or `base64,`

---

## Performance Tips

1. **For large images**: Use file upload (Mode 1) instead of Base64 (Mode 2)
2. **For bulk updates**: Consider grouping operations to minimize API calls
3. **For multiple images**: Use field index patterns (freight-0-0, freight-0-1, etc.)
4. **For network efficiency**: Use gzip compression for requests
