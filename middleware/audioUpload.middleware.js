// audioUpload.middleware.js
// Middleware for handling audio file uploads and storage

import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';

// Ensure temp/audio directory exists
async function ensureTempAudioDir() {
  const dir = 'temp/audio';
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dir}:`, error);
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureTempAudioDir();
    cb(null, 'temp/audio');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-user.extension
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.wav';
    const filename = `${timestamp}-user${ext}`;
    cb(null, filename);
  }
});

// File filter - accept only audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/aac'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only audio files are allowed. Got: ${file.mimetype}`), false);
  }
};

// Create multer upload instance
export const uploadAudio = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware to process uploaded audio and transcribe
export async function transcribeAudioMiddleware(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please upload an audio file'
      });
    }

    console.log('─'.repeat(60));
    console.log('📁 Audio file uploaded:');
    console.log(`   Path: ${req.file.path}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`   MIME: ${req.file.mimetype}`);
    console.log('─'.repeat(60));

    // Attach file info to request for next middleware/route handler
    req.audioFile = {
      path: req.file.path,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    next();
  } catch (error) {
    console.error('❌ Audio upload error:', error);
    res.status(500).json({
      error: 'Audio upload failed',
      message: error.message
    });
  }
}