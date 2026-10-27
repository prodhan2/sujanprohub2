# Image to WebP Converter API

A RESTful API for converting images to WebP format with optional resizing and quality control.

## Features

- Convert single or multiple images to WebP format
- Adjustable quality settings (0.1 - 1.0)
- Optional image resizing (max width/height)
- Base64 encoded output for easy integration
- File size comparison and savings calculation
- CORS enabled for cross-origin requests

## Installation

```bash
cd server
npm install
```

## Running the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server will start on port 3001 by default.

## API Endpoints

### GET /

Returns API documentation and usage examples.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /convert

Convert a single image to WebP format.

**Parameters:**
- `file` (required): Image file (multipart/form-data)
- `quality` (optional): WebP quality 0.1-1.0 (default: 0.8)
- `maxWidth` (optional): Maximum width in pixels
- `maxHeight` (optional): Maximum height in pixels

**Response:**
```json
{
  "success": true,
  "originalSize": "2.5 MB",
  "convertedSize": "500 KB",
  "savings": "80% smaller",
  "image": "base64_encoded_webp_image",
  "mimeType": "image/webp"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:3001/convert \
  -F "file=@image.jpg" \
  -F "quality=0.8" \
  -F "maxWidth=1920"
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('quality', 0.8);
formData.append('maxWidth', 1920);

fetch('http://localhost:3001/convert', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Original:', data.originalSize);
  console.log('Converted:', data.convertedSize);
  console.log('Savings:', data.savings);
  
  // Display the converted image
  const img = document.createElement('img');
  img.src = `data:${data.mimeType};base64,${data.image}`;
  document.body.appendChild(img);
});
```

### POST /convert-multiple

Convert multiple images to WebP format.

**Parameters:**
- `files` (required): Array of image files (multipart/form-data, max 10 files)
- `quality` (optional): WebP quality 0.1-1.0 (default: 0.8)
- `maxWidth` (optional): Maximum width in pixels
- `maxHeight` (optional): Maximum height in pixels

**Response:**
```json
{
  "success": true,
  "count": 3,
  "totalOriginalSize": "7.5 MB",
  "totalConvertedSize": "1.5 MB",
  "totalSavings": "80% smaller",
  "images": [
    {
      "originalName": "image1.jpg",
      "originalSize": "2.5 MB",
      "convertedSize": "500 KB",
      "savings": "80% smaller",
      "image": "base64_encoded_webp_image",
      "mimeType": "image/webp"
    },
    ...
  ]
}
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
for (let i = 0; i < files.length; i++) {
  formData.append('files', files[i]);
}
formData.append('quality', 0.8);

fetch('http://localhost:3001/convert-multiple', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Converted', data.count, 'images');
  console.log('Total savings:', data.totalSavings);
  
  // Display all converted images
  data.images.forEach((imgData, index) => {
    const img = document.createElement('img');
    img.src = `data:${imgData.mimeType};base64,${imgData.image}`;
    document.body.appendChild(img);
  });
});
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400`: Bad request (no file, invalid file type, file too large)
- `500`: Internal server error (conversion failed)

**Error Response:**
```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

## Limitations

- Maximum file size: 10MB per file
- Maximum files per request: 10 (for multiple conversion)
- Supported formats: All image formats supported by Sharp (JPEG, PNG, GIF, WebP, etc.)

## Technologies

- Express.js - Web framework
- Multer - File upload handling
- Sharp - Image processing
- CORS - Cross-origin resource sharing

## License

Powered by Sujan Prodhan | CSE, University of Rajshahi
