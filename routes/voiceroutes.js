import express from "express";
import { getTranscriberService } from "../Transcriber.js";
import {
  uploadAudio,
  transcribeAudioMiddleware,
} from "../middleware/audioUpload.middleware.js";
import { processVoice } from "../controller/voiceController.js";

const router = express.Router();

// Voice routes CORS middleware - matches main app configuration
router.use((req, res, next) => {
  // Set specific origin for your frontend
  const allowedOrigins = [
    "https://cliqtrix-voice-agent.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ];

  const origin = req.headers.origin;
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "*";

  // Always set CORS headers for voice routes
  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, userId, userid"
  );

  console.log(
    `🎯 Voice CORS: ${req.method} ${req.path} from ${
      origin || "unknown"
    } -> allowing ${allowOrigin}`
  );

  if (req.method === "OPTIONS") {
    console.log(`🔄 Voice routes OPTIONS handler: ${req.path}`);
    res.status(200).end();
    return;
  }
  next();
});

// Voice routes logging middleware
router.use((req, res, next) => {
  console.log(`🎯 Voice Route: ${req.method} ${req.path}`);
  console.log(
    `👤 UserId: ${req.headers.userid || req.headers.userId || "none"}`
  );
  next();
});

// Middleware: accept any file field name and normalize to req.file
function acceptAnyFile(req, res, next) {
  const handler = uploadAudio.any();
  handler(req, res, function (err) {
    if (err) {
      // Return a clearer error for upload problems
      return res.status(400).json({
        success: false,
        error: "File upload error",
        message: err.message,
      });
    }

    // If multer populated req.files, normalize the first file to req.file
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
}

// Initialize transcriber service
const transcriber = getTranscriberService(
  process.env.GOOGLE_API_KEY,
  process.env.GENAI_MODEL || "gemini-2.0-flash-lite"
);

/**
 * POST /api/transcribe
 * Complete voice agent workflow:
 * 1. Upload audio file
 * 2. Transcribe speech to text
 * 3. Detect intent (create todo, show todos, etc.)
 * 4. Execute the appropriate action
 *
 * Headers required: userId
 */
router.post(
  "/transcribe",
  // Debug middleware
  (req, res, next) => {
    console.log("🎯 TRANSCRIBE POST request received");
    console.log("📁 Content-Type:", req.headers["content-type"]);
    console.log(
      "👤 UserId header:",
      req.headers["userid"] || req.headers["userId"]
    );
    console.log("📊 Body keys:", Object.keys(req.body || {}));
    next();
  },
  acceptAnyFile, // accept any file field and normalize to req.file
  transcribeAudioMiddleware, // Custom middleware - logs file info and validates
  processVoice // Complete voice processing workflow
);

/**
 * POST /api/transcribe-only
 * Just transcribe audio without intent processing
 */

router.post(
  "/transcribe-only",
  acceptAnyFile, // accept any file field and normalize to req.file
  transcribeAudioMiddleware, // Custom middleware - logs file info
  async (req, res) => {
    try {
      console.log("🎤 Starting transcription only...");

      // Transcribe the uploaded audio file
      const transcription = await transcriber.transcribe(req.audioFile.path);

      console.log("─".repeat(60));
      console.log("✅ TRANSCRIPTION RESULT:");
      console.log(transcription);
      console.log("─".repeat(60));

      // Return response
      res.json({
        success: true,
        transcription: transcription,
        audioFile: {
          filename: req.audioFile.filename,
          size: req.audioFile.size,
          path: req.audioFile.path,
        },
      });
    } catch (error) {
      console.error("❌ Transcription error:", error);
      res.status(500).json({
        success: false,
        error: "Transcription failed",
        message: error.message,
      });
    }
  }
);

export default router;
