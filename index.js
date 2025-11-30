// server.js (corrected)
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import OAuthToken from "./Models/oauthModel.js";
import OAuthState from "./Models/oauthStateModel.js";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Db/db.js";
import crypto from "crypto";

dotenv.config();

// Validate critical environment variables
function validateEnvironment() {
  const required = [
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REDIRECT_URI",
    "OAUTH_AUTHORIZE_URL",
    "OAUTH_TOKEN_URL",
    "FRONTEND_VOICE_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    console.error(
      "📋 Please check your .env file and ensure all OAuth variables are set"
    );
    process.exit(1);
  }

  console.log("✅ Environment variables validated");

  // Warn about default secrets
  if (
    process.env.STATE_SECRET === "change_this_state_secret" ||
    process.env.SESSION_SECRET === "change_this_in_production"
  ) {
    console.warn("⚠️ Using default secrets - please change for production!");
  }
}

validateEnvironment();

// Initialize database connection
connectDB().catch((error) => {
  console.error("❌ Database connection failed:", error.message);
  process.exit(1);
});

const app = express();

// --- Helper: base64url encode/decode + state signing ----
const base64urlEncode = (str) =>
  Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64urlDecode = (s) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();

// Simple consistent state secret
const STATE_SECRET = process.env.STATE_SECRET || "change_this_state_secret";

console.log(
  "🔑 Using STATE_SECRET:",
  STATE_SECRET === "change_this_state_secret" ? "default" : "custom"
);

function signState(payload) {
  try {
    console.log("🔐 Signing state payload:", payload.substring(0, 50) + "...");
    const mac = crypto
      .createHmac("sha256", STATE_SECRET)
      .update(payload)
      .digest("hex");
    const signed = base64urlEncode(`${payload}|${mac}`);
    console.log("✅ State signed successfully, length:", signed.length);
    return signed;
  } catch (error) {
    console.error("❌ State signing failed:", error.message);
    throw error;
  }
}

function verifyState(token) {
  try {
    console.log("🔍 Verifying state token, length:", token?.length);

    if (!token || typeof token !== "string") {
      console.log("❌ Invalid token type or missing token");
      return null;
    }

    const decoded = base64urlDecode(token);
    console.log("🔓 Token decoded, length:", decoded.length);

    const parts = decoded.split("|");
    console.log("📊 Token parts count:", parts.length);

    if (parts.length < 3) {
      console.log("❌ Insufficient token parts");
      return null;
    }

    const mac = parts.pop();
    const payload = parts.join("|");

    // Try multiple possible secrets for backward compatibility
    const possibleSecrets = [
      STATE_SECRET, // Current secret
      "change_this_state_secret", // Original default (most likely to work)
      process.env.SESSION_SECRET || "change_this_in_production", // Session fallback
      "zoho_oauth_state_secret_2024", // Alternative default
      process.env.STATE_SECRET, // Explicit env var if different from computed
      process.env.SESSION_SECRET, // Explicit session secret
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    console.log("🔐 MAC verification (trying multiple secrets):");
    console.log("  - Received MAC:", mac.substring(0, 16) + "...");
    console.log("  - Token payload:", payload);
    console.log("  - Secrets to try:", possibleSecrets.length);

    for (let i = 0; i < possibleSecrets.length; i++) {
      const secret = possibleSecrets[i];
      const expectedMac = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      console.log(
        `  - Try ${i + 1} (${
          secret === STATE_SECRET ? "current" : "fallback"
        }):`
      );
      console.log(`    Expected: ${expectedMac.substring(0, 16)}...`);

      // timingSafeEqual requires buffers of same length
      const macBuf = Buffer.from(mac, "hex");
      const expectedBuf = Buffer.from(expectedMac, "hex");

      if (
        macBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(macBuf, expectedBuf)
      ) {
        const [stateId, cliqUserId] = payload.split("|");
        console.log(`✅ State verified with secret ${i + 1}:`);
        console.log("  - State ID:", stateId);
        console.log("  - Cliq User ID:", cliqUserId);

        return { stateId, cliqUserId: cliqUserId || null };
      }
    }

    console.log("❌ MAC verification failed with all possible secrets");
    return null;
  } catch (err) {
    console.error("❌ State verification error:", err.message);
    return null;
  }
}

// ----------------- CORS + middlewares (unchanged logic, minor tweaks) -----------------
const allowedOrigins = [
  "https://cliqtrix-voice-agent.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];
const vercelPreviewPattern =
  /^https:\/\/cliqtrix-voice-agent[-a-z0-9]*\.vercel\.app$/i;

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelPreviewPattern.test(origin)) return callback(null, true);
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
  credentials: false,
  maxAge: 86400,
};

app.use((req, res, next) => {
  const origin = req.headers.origin || "unknown";
  console.log(`🌐 CORS: ${req.method} ${req.url} from ${origin}`);
  next();
});
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(corsOptions)(req, res, () => {
      res.status(204).end();
    });
  }
  next();
});
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

// MongoDB-based session store to fix MemoryStore warning
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_in_production",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://nithishkumarnk182005_db_user:3LZEOEORRiL1deWW@cluster0.l7dkvqq.mongodb.net/?appName=Cluster0",
      collectionName: "oauth_sessions",
      ttl: 24 * 60 * 60, // 24 hours session expiry
    }),
    cookie: {
      secure: false, // set to true when behind HTTPS/proxy
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ---- env vars ----
const {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  OAUTH_USERINFO_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPE,
  FRONTEND_VOICE_URL,
} = process.env;

// ----------------- Routes -----------------

// Cleanup job for expired OAuth states
async function cleanupExpiredStates() {
  try {
    const result = await OAuthState.deleteMany({
      expires_at: { $lt: new Date() },
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired OAuth states`);
    }
  } catch (error) {
    console.warn("⚠️ OAuth state cleanup failed:", error.message);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredStates, 30 * 60 * 1000);

// /start now forwards cliq_user_id with improved error handling
app.get("/start", async (req, res) => {
  try {
    const cliqUserId = req.query.cliq_user_id;

    console.log("🚀 Start route accessed:");
    console.log("  - Cliq User ID:", cliqUserId);
    console.log("  - Query params:", req.query);
    console.log("  - Session ID:", req.sessionID);

    if (!cliqUserId) {
      console.error("❌ Missing cliq_user_id parameter");
      return res.status(400).send("Missing required parameter: cliq_user_id");
    }

    // Check MongoDB for an existing oauth token for this external user id
    console.log("🔍 Checking for existing OAuth token...");
    const existing = await OAuthToken.findOne({
      external_user_id: String(cliqUserId),
    }).lean();

    if (existing) {
      console.log("✅ Found existing OAuth token, redirecting to voice app");
      const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
        cliqUserId
      )}`;
      console.log("🔗 Redirect URL:", redirectUrl);
      return res.redirect(redirectUrl);
    }

    console.log("📝 No existing token found, starting OAuth flow");
    // Redirect to /auth/login with cliq_user_id in query (avoids relying on server session)
    const loginUrl = `/auth/login?cliq_user_id=${encodeURIComponent(
      cliqUserId
    )}`;
    console.log("🔗 Login URL:", loginUrl);
    return res.redirect(loginUrl);
  } catch (err) {
    console.error("❌ Start route error:");
    console.error("  - Error:", err.message);
    console.error("  - Stack:", err.stack);
    console.error("  - Query:", req.query);

    const detail = err?.response?.data || err?.message || String(err);
    return res
      .status(500)
      .send(`Start failed: ${detail}. Please try again or contact support.`);
  }
});

// Simple OAuth login - just store user ID in session
app.get("/auth/login", async (req, res) => {
  try {
    const cliqUserId = req.query.cliq_user_id || "";

    console.log("🔐 Simple OAuth Login:");
    console.log("  - Cliq User ID:", cliqUserId);

    // Just use a simple state - no encryption needed
    const simpleState = cliqUserId;

    // Store in session
    req.session.cliq_user_id = cliqUserId;
    req.session.oauth_state = simpleState;

    const url = new URL(OAUTH_AUTHORIZE_URL);
    url.searchParams.append("client_id", CLIENT_ID);
    url.searchParams.append("scope", SCOPE);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", REDIRECT_URI);
    url.searchParams.append("state", simpleState);
    url.searchParams.append("access_type", "offline");

    console.log("✅ Redirecting to Zoho OAuth...");
    return res.redirect(url.toString());
  } catch (error) {
    console.error("❌ OAuth login error:", error);
    return res.status(500).send(`OAuth login failed: ${error.message}`);
  }
});

// Simple OAuth callback - no complex validation
app.get("/auth/callback", async (req, res) => {
  try {
    const { code, state: stateToken, error } = req.query;

    console.log("🔄 Simple OAuth Callback:");
    console.log("  - Code received:", code ? "✅ Yes" : "❌ No");
    console.log("  - State received:", stateToken || "None");
    console.log("  - Error:", error || "None");

    if (error) {
      console.error("❌ OAuth provider error:", error);
      return res.status(400).send(`OAuth provider error: ${error}`);
    }

    if (!code) {
      console.error("❌ Missing authorization code");
      return res.status(400).send("Missing authorization code.");
    }

    // Simple validation - just check if state matches session
    const cliqUserId = stateToken || req.session?.cliq_user_id || null;
    
    console.log("✅ Using Cliq User ID:", cliqUserId);

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

    // Persist tokens in MongoDB using cliqUserId from the signed state
    const doc = new OAuthToken({
      provider: "Zoho",
      external_user_id: cliqUserId || null,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
      scope: SCOPE,
      profile: userProfile || null,
    });
    const inserted = await doc.save();
    console.log("Inserted oauth row into MongoDB:", inserted._id);

    const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
      cliqUserId || ""
    )}`;

    console.log("🎉 Simple OAuth success!");
    console.log("  - Cliq User ID:", cliqUserId);
    console.log("  - Redirecting to:", redirectUrl);

    // Simple cleanup
    delete req.session.oauth_state;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ OAuth Callback Error:");
    console.error("  - Error:", err.response?.data || err.message);
    console.error("  - Stack:", err.stack);
    console.error("  - Session ID:", req.sessionID);
    console.error("  - Query params:", req.query);

    return res
      .status(500)
      .send(
        `OAuth failed: ${
          err.response?.data?.error_description || err.message || String(err)
        }`
      );
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

app.get("/api/transcribe-test", (req, res) => {
  res.json({
    message: "Transcribe endpoint is accessible via GET",
    note: "Use POST with audio file for actual transcription",
    requiredHeaders: ["userId"],
    supportedMethods: ["POST", "OPTIONS"],
  });
});

// Debug endpoints for OAuth troubleshooting
app.get("/debug/oauth-states", async (req, res) => {
  try {
    const states = await OAuthState.find().sort({ created_at: -1 }).limit(10);
    res.json({
      message: "Recent OAuth states",
      count: states.length,
      states: states.map((s) => ({
        state: s.state.substring(0, 10) + "...",
        cliq_user_id: s.cliq_user_id,
        created_at: s.created_at,
        expires_at: s.expires_at,
        expired: new Date() > s.expires_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/debug/oauth-tokens", async (req, res) => {
  try {
    const tokens = await OAuthToken.find()
      .sort({ created_at: -1 })
      .limit(10)
      .select("-access_token -refresh_token");
    res.json({
      message: "Recent OAuth tokens",
      count: tokens.length,
      tokens: tokens.map((t) => ({
        provider: t.provider,
        external_user_id: t.external_user_id,
        created_at: t.created_at,
        expires_at: t.expires_at ? new Date(t.expires_at * 1000) : null,
        expired: t.expires_at
          ? new Date(t.expires_at * 1000) < new Date()
          : false,
        profile: t.profile
          ? { name: t.profile.name, email: t.profile.email }
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/debug/session", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: {
      oauth_state: req.session.oauth_state,
      cliq_user_id: req.session.cliq_user_id,
      state_token: req.session.state_token
        ? req.session.state_token.substring(0, 20) + "..."
        : null,
    },
    cookies: req.headers.cookie,
  });
});

// Special debug endpoint to test state verification with specific token
app.get("/debug/verify-state/:token", (req, res) => {
  try {
    const { token } = req.params;

    console.log(
      "🧪 Debug state verification for token:",
      token.substring(0, 20) + "..."
    );

    // Decode the token manually
    const decoded = base64urlDecode(token);
    const parts = decoded.split("|");

    if (parts.length < 3) {
      return res.json({
        error: "Invalid token structure",
        parts_count: parts.length,
        decoded: decoded,
      });
    }

    const mac = parts.pop();
    const payload = parts.join("|");
    const [stateId, cliqUserId] = payload.split("|");

    // Test all possible secrets
    const testSecrets = [
      "change_this_state_secret",
      "change_this_in_production",
      "zoho_oauth_state_secret_2024",
      STATE_SECRET,
      process.env.STATE_SECRET,
      process.env.SESSION_SECRET,
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const results = testSecrets.map((secret) => {
      const expectedMac = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      const matches = expectedMac === mac;

      return {
        secret: secret === STATE_SECRET ? `${secret} (CURRENT)` : secret,
        matches,
        expected_mac: expectedMac.substring(0, 16) + "...",
        received_mac: mac.substring(0, 16) + "...",
      };
    });

    // Try the verifyState function
    const verifyResult = verifyState(token);

    res.json({
      token_info: {
        length: token.length,
        state_id: stateId,
        cliq_user_id: cliqUserId,
        payload: payload,
      },
      current_server_secret: {
        value:
          STATE_SECRET === "change_this_state_secret"
            ? "original_default"
            : "custom",
        length: STATE_SECRET.length,
        first_10: STATE_SECRET.substring(0, 10),
      },
      mac_tests: results,
      verify_function_result: verifyResult,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        STATE_SECRET_set: !!process.env.STATE_SECRET,
        SESSION_SECRET_set: !!process.env.SESSION_SECRET,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

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
    debugEndpoints: {
      "GET /debug/oauth-states": "View recent OAuth states",
      "GET /debug/oauth-tokens": "View recent OAuth tokens",
      "GET /debug/session": "View current session data",
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

// Global error handler that preserves CORS headers
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
  console.log(`🚀 Server running on port ${process.env.PORT || 3000} `);
});
