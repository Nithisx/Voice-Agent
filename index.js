import express from "express";
import session from "express-session";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import catalystSDK from "zcatalyst-sdk-node";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Db/db.js";

dotenv.config();

// Initialize database connection
connectDB().catch(console.error);

const app = express();

// Centralized CORS with explicit preflight handling
const allowedOrigins = [
  "https://cliqtrix-voice-agent.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];
// Allow Vercel preview subdomains for this project
const vercelPreviewPattern =
  /^https:\/\/cliqtrix-voice-agent[-a-z0-9]*\.vercel\.app$/i;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without Origin (e.g., server-to-server, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelPreviewPattern.test(origin)) return callback(null, true);
    // Fallback: reject unknown origins to avoid '*' with credentials issues
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "userId",
    "userid",
  ],
  credentials: false, // we are not using cookies across origins
  maxAge: 86400, // cache preflight for 1 day
  preflightContinue: false,
};

// Use cors for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin || "unknown";
  console.log(`🌐 CORS: ${req.method} ${req.url} from ${origin}`);
  next();
});
app.use(cors(corsOptions));
// Ensure Vary header to avoid cache serving wrong CORS
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});
// Explicit preflight handler: use middleware instead of wildcard path to avoid path-to-regexp errors on Catalyst
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(corsOptions)(req, res, () => {
      // If cors didn't end the response, send OK
      res.status(204).end();
    });
  }
  next();
});

// Fallback CORS header setter in case upstream or errors skip cors middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, userId, userid"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📝 ${timestamp} - ${req.method} ${req.path}`);
  console.log("🔗 Origin:", req.headers.origin || "none");
  console.log("📋 User-Agent:", req.headers["user-agent"] || "none");

  if (req.headers.userid || req.headers.userId) {
    console.log("� UserId:", req.headers.userid || req.headers.userId);
  }

  next();
});

// session for OAuth state + cliq_user_id
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_in_production",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set true if HTTPS + behind proxy
  })
);

const {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  OAUTH_USERINFO_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPE,
  FRONTEND_VOICE_URL, // e.g. https://frontend.example.com/voice
} = process.env;

// Validate required environment variables
const requiredEnvVars = {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  OAUTH_USERINFO_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPE,
  FRONTEND_VOICE_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn("⚠️  Missing environment variables:", missingVars.join(", "));
  console.warn("🔧 Some OAuth functionality may not work properly");
}

app.get("/start", async (req, res) => {
  try {
    const cliqUserId = req.query.cliq_user_id;
    if (!cliqUserId) {
      return res.status(400).send("Missing cliq_user_id");
    }

    console.log("🔍 Checking for existing token for user:", cliqUserId);

    let catalystApp, zcql;
    try {
      catalystApp = catalystSDK.initialize(req);
      console.log("✅ Catalyst SDK initialized successfully");
      zcql = catalystApp.zcql();
      console.log("✅ ZCQL instance created successfully");
    } catch (initError) {
      console.error("❌ Catalyst SDK initialization failed:", initError);
      // If initialization fails, proceed to OAuth without checking for existing tokens
      req.session.cliq_user_id = cliqUserId;
      return res.redirect("/auth/login");
    }

    // Use ZCQL to check if a row exists for this external_user_id
    const query = `SELECT * FROM oauth_tokens WHERE external_user_id = '${cliqUserId}'`;
    console.log("📋 Executing ZCQL query:", query);

    let result;
    try {
      result = await zcql.executeZCQLQuery(query);
      console.log("✅ ZCQL query result:", JSON.stringify(result, null, 2));
    } catch (zcqlError) {
      console.error("❌ ZCQL query error:", zcqlError);
      // If ZCQL fails, assume no token exists and proceed to OAuth
      console.log("🔄 ZCQL failed, proceeding to OAuth login");
      req.session.cliq_user_id = cliqUserId;
      return res.redirect("/auth/login");
    }

    // Check if result exists and has data
    if (result && Array.isArray(result) && result.length > 0) {
      console.log("🎉 Found existing token, redirecting to voice UI");
      // token exists → go directly to frontend voice UI
      if (FRONTEND_VOICE_URL) {
        const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
          cliqUserId
        )}`;
        return res.redirect(redirectUrl);
      } else {
        // Fallback if FRONTEND_VOICE_URL is not set
        return res.json({
          success: true,
          message: "User authenticated successfully",
          cliq_user_id: cliqUserId,
          has_token: true,
          redirect_note: "FRONTEND_VOICE_URL not configured",
        });
      }
    }

    console.log("🆕 No existing token found, starting OAuth flow");
    // no token → store cliq_user_id in session and go through OAuth login
    req.session.cliq_user_id = cliqUserId;
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Start route error details:", {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
      name: err.name,
      code: err.code,
    });
    return res
      .status(500)
      .send("Start failed: " + (err.message || "Unknown error"));
  }
});

app.get("/auth/login", (req, res) => {
  const state = uuidv4();
  req.session.oauth_state = state;

  const cliqUserId = req.query.cliq_user_id;
  if (cliqUserId) {
    req.session.cliq_user_id = cliqUserId;
  }

  const url = new URL(OAUTH_AUTHORIZE_URL);
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("scope", SCOPE);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("redirect_uri", REDIRECT_URI);
  url.searchParams.append("state", state);
  url.searchParams.append("access_type", "offline");

  return res.redirect(url.toString());
});

app.get("/auth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state || state !== req.session.oauth_state) {
      return res.status(400).send("Invalid OAuth state.");
    }

    const tokenRes = await axios.post(
      OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const tokenData = tokenRes.data;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    let userProfile = null;
    try {
      const profileRes = await axios.get(OAUTH_USERINFO_URL, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      userProfile = profileRes.data;
      console.log("Zoho userProfile:", JSON.stringify(userProfile, null, 2));
    } catch (e) {
      console.log("Couldn't fetch Zoho user info:", e.message);
    }

    const cliqUserId = req.session.cliq_user_id || null;

    const catalystApp = catalystSDK.initialize(req);
    const datastore = catalystApp.datastore();
    const table = datastore.table("oauth_tokens");

    const row = {
      provider: "Zoho",
      external_user_id: cliqUserId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
      scope: SCOPE,
      created_at: new Date().toISOString(),
    };

    const inserted = await table.insertRow(row);
    console.log("Inserted oauth row:", inserted);

    const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
      cliqUserId || ""
    )}`;

    delete req.session.oauth_state;
    delete req.session.cliq_user_id;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("OAuth Callback Error:", err.response?.data || err.message);
    return res.status(500).send("OAuth failed: " + err.message);
  }
});

// Import routes
const { default: transcribeRouter } = await import("./routes/voiceroutes.js");
const { default: todoRouter } = await import("./routes/todoRoutes.js");

// Use routes
app.use("/api", transcribeRouter);
app.use("/api/todos", todoRouter);

// health check
app.get("/health", (req, res) => res.send({ status: "ok" }));

// CORS test endpoints (both GET and POST)
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "CORS GET is working!",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || "none",
    deployment: "catalyst-serverless",
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"] || "none",
  });
});

app.post("/api/test-cors", (req, res) => {
  res.json({
    message: "CORS POST is working!",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || "none",
    deployment: "catalyst-serverless",
    method: req.method,
    url: req.url,
    userId: req.headers.userid || req.headers.userId || "none",
    hasFormData: req.body ? Object.keys(req.body).length > 0 : false,
    userAgent: req.headers["user-agent"] || "none",
  });
});

// Specific test for the transcribe endpoint method
app.get("/api/transcribe-test", (req, res) => {
  res.json({
    message: "Transcribe endpoint is accessible via GET",
    note: "Use POST with audio file for actual transcription",
    requiredHeaders: ["userId"],
    supportedMethods: ["POST", "OPTIONS"],
  });
});

// API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    message: "Voice Agent API Documentation",
    endpoints: {
      "POST /api/transcribe": {
        description:
          "Complete voice agent workflow - upload audio, transcribe, detect intent, execute action",
        headers: { userId: "required - user identifier" },
        body: "multipart/form-data with audio file",
        supportedFormats: ["wav", "mp3", "ogg", "webm", "m4a", "aac"],
        responses: {
          success: "Action executed based on voice command",
          error: "Error details with message",
        },
      },
      "POST /api/transcribe-only": {
        description: "Just transcribe audio to text without processing",
        body: "multipart/form-data with audio file",
        responses: {
          success: "Transcription text only",
        },
      },
      "POST /api/todos/create": {
        description: "Create a new todo item",
        body: { userId: "string", text: "string" },
      },
      "GET /api/todos/list/:userId": {
        description: "Get all todos for a user",
      },
      "POST /api/todos/complete": {
        description: "Complete and remove a todo item",
        body: { userId: "string", text: "string" },
      },
    },
    voiceCommands: [
      "Create todo [task description]",
      "Add task [task description]",
      "Show my todos",
      "List my tasks",
      "Completed [task description]",
      "Done with [task description]",
      "Finished [task description]",
      "What can you do?",
      "Help",
    ],
  });
});

export default app;

// Global error handler that preserves CORS headers
// Place after routes; Catalyst may surface 500s without headers otherwise
app.use((err, req, res, next) => {
  console.error(
    "💥 Global error handler:",
    err && (err.stack || err.message || err)
  );
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, userId, userid"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
    );
  }
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}...`);
});
