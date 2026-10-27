const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Image to WebP Converter API',
    version: '1.0.0',
    endpoints: {
      'POST /api/convert': {
        description: 'Convert single image to WebP',
        parameters: {
          file: 'Image file (multipart/form-data)',
          quality: 'WebP quality (0.1 - 1.0, default: 0.8)',
          maxWidth: 'Maximum width in pixels (optional)',
          maxHeight: 'Maximum height in pixels (optional)'
        },
        response: {
          success: 'boolean',
          originalSize: 'string',
          convertedSize: 'string',
          savings: 'string',
          image: 'base64 encoded WebP image'
        }
      },
      'POST /api/convert-multiple': {
        description: 'Convert multiple images to WebP',
        parameters: {
          files: 'Array of image files (multipart/form-data)',
          quality: 'WebP quality (0.1 - 1.0, default: 0.8)',
          maxWidth: 'Maximum width in pixels (optional)',
          maxHeight: 'Maximum height in pixels (optional)'
        },
        response: {
          success: 'boolean',
          totalOriginalSize: 'string',
          totalConvertedSize: 'string',
          totalSavings: 'string',
          images: 'array of converted images with metadata'
        }
      },
      'GET /api/health': {
        description: 'Health check endpoint',
        response: {
          status: 'string',
          timestamp: 'string'
        }
      }
    },
    example: {
      curl: "curl -X POST http://localhost:3001/api/convert -F 'file=@image.jpg' -F 'quality=0.8'",
      javascript: `
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('quality', 0.8);

fetch('http://localhost:3001/api/convert', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
      `,
      flutter: `
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> convertImage(String imagePath) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('http://localhost:3001/api/convert'),
  );
  
  request.files.add(await http.MultipartFile.fromPath('file', imagePath));
  request.fields['quality'] = '0.8';
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  var data = json.decode(responseData);
  
  if (data['success']) {
    print('Original: \${data['originalSize']}');
    print('Converted: \${data['convertedSize']}');
    print('Savings: \${data['savings']}');
    
    var imageBytes = base64Decode(data['image']);
    // Save imageBytes to file...
  }
}
      `
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Single image conversion endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const quality = parseFloat(req.body.quality) || 0.8;
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;

    let sharpInstance = sharp(req.file.buffer);

    // Resize if dimensions provided
    if (maxWidth || maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to WebP
    const convertedBuffer = await sharpInstance
      .webp({ quality: quality })
      .toBuffer();

    const originalSize = req.file.size;
    const convertedSize = convertedBuffer.length;
    const savings = ((1 - convertedSize / originalSize) * 100).toFixed(1);

    res.json({
      success: true,
      originalSize: formatFileSize(originalSize),
      convertedSize: formatFileSize(convertedSize),
      savings: savings > 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`,
      image: convertedBuffer.toString('base64'),
      mimeType: 'image/webp'
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert image', message: error.message });
  }
});

// Multiple images conversion endpoint
app.post('/api/convert-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const quality = parseFloat(req.body.quality) || 0.8;
    const maxWidth = parseInt(req.body.maxWidth) || null;
    const maxHeight = parseInt(req.body.maxHeight) || null;

    const convertedImages = [];
    let totalOriginalSize = 0;
    let totalConvertedSize = 0;

    for (const file of req.files) {
      let sharpInstance = sharp(file.buffer);

      // Resize if dimensions provided
      if (maxWidth || maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to WebP
      const convertedBuffer = await sharpInstance
        .webp({ quality: quality })
        .toBuffer();

      const originalSize = file.size;
      const convertedSize = convertedBuffer.length;
      const savings = ((1 - convertedSize / originalSize) * 100).toFixed(1);

      totalOriginalSize += originalSize;
      totalConvertedSize += convertedSize;

      convertedImages.push({
        originalName: file.originalname,
        originalSize: formatFileSize(originalSize),
        convertedSize: formatFileSize(convertedSize),
        savings: savings > 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`,
        image: convertedBuffer.toString('base64'),
        mimeType: 'image/webp'
      });
    }

    const totalSavings = ((1 - totalConvertedSize / totalOriginalSize) * 100).toFixed(1);

    res.json({
      success: true,
      count: convertedImages.length,
      totalOriginalSize: formatFileSize(totalOriginalSize),
      totalConvertedSize: formatFileSize(totalConvertedSize),
      totalSavings: totalSavings > 0 ? `${totalSavings}% smaller` : `${Math.abs(totalSavings)}% larger`,
      images: convertedImages
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert images', message: error.message });
  }
});

// Google Drive to JSON Proxy Endpoint
app.get('/api/drive-json', async (req, res) => {
  try {
    const folderUrl = req.query.url || req.query.id || req.query.link;
    if (!folderUrl) {
      return res.status(400).json({
        status: 'error',
        message: "Missing Google Drive folder URL or ID. Use '?url=YOUR_DRIVE_FOLDER_LINK'"
      });
    }

    const scriptUrl = 'https://script.google.com/macros/s/AKfycbzXPTAniFsixG52cJ8j7eujRu3cQaDmfgh93b0F1255K-BTf8Yovtotc0XIKPJfeJfi/exec';
    const targetUrl = `${scriptUrl}?url=${encodeURIComponent(folderUrl)}`;

    const response = await fetch(targetUrl);
    const data = await response.json();

    res.json(data);
  } catch (err) {
    console.error('Drive to JSON error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to process Google Drive request'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Image Converter API running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}`);
});
