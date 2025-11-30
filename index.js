import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "./Db/db.js";
import OAuthToken from "./Models/oauthModel.js";

dotenv.config();

const app = express();

// Trust Render's proxy for secure cookies
app.set("trust proxy", 1);

// Initialize database connection with better error handling
let dbConnected = false;
let sessionStore = null;

// Initialize database and session store
async function initializeApp() {
  try {
    await connectDB();
    dbConnected = true;
    console.log("✅ Database connected successfully");

    // Create session store after DB connection
    sessionStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: "oauth_db",
      collectionName: "sessions",
      touchAfter: 24 * 3600,
      ttl: 14 * 24 * 60 * 60,
      autoRemove: "native",
      autoRemoveInterval: 10,
    });
    console.log("✅ Session store created successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    console.error("⚠️  App will continue but OAuth features may not work");
  }
}

// Start initialization
await initializeApp();

// CORS Configuration
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
  credentials: true, // Changed to true for session cookies
  maxAge: 86400,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

// OPTIONS handler - use a RegExp to match any path and avoid path-to-regexp token parsing
// Using a RegExp (/.*/) prevents the '*' string from being parsed as a parameter name.
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📝 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`🔗 Origin: ${req.headers.origin || "none"}`);
  console.log(`🍪 Cookie: ${req.headers.cookie ? "present" : "none"}`);
  console.log(
    `📋 User-Agent: ${req.headers["user-agent"]?.slice(0, 50) || "none"}`
  );

  if (req.query.cliq_user_id) {
    console.log(`👤 Query cliq_user_id: ${req.query.cliq_user_id}`);
  }

  next();
});

// Session configuration with better MongoDB store setup
const sessionConfig = {
  secret:
    process.env.SESSION_SECRET || "change_this_in_production_" + Math.random(),
  resave: false,
  saveUninitialized: true, // Changed to true to ensure session is created
  name: "zoho_oauth_session", // Custom session name
  proxy: true, // Trust Render's proxy
  cookie: {
    secure: process.env.NODE_ENV === "production", // true in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Important for cross-site
    domain: process.env.NODE_ENV === "production" ? undefined : undefined,
  },
};

// Add store only if it was successfully created
if (sessionStore) {
  sessionConfig.store = sessionStore;

  // Add session store error handling
  sessionStore.on("error", (error) => {
    console.error("❌ Session Store Error:", error);
  });

  sessionStore.on("connected", () => {
    console.log("✅ Session store connected to MongoDB");
  });

  sessionStore.on("disconnected", () => {
    console.warn("⚠️  Session store disconnected from MongoDB");
  });
} else {
  console.warn(
    "⚠️  Using memory store for sessions (not recommended for production)"
  );
}

app.use(session(sessionConfig));

// Session debug middleware
app.use((req, res, next) => {
  if (req.session) {
    console.log(`🔑 Session ID: ${req.sessionID?.slice(0, 8)}...`);
    console.log(`📦 Session Data:`, {
      cliq_user_id: req.session.cliq_user_id,
      oauth_state: req.session.oauth_state
        ? req.session.oauth_state.slice(0, 8) + "..."
        : undefined,
      cookie: req.session.cookie,
    });
  } else {
    console.log("⚠️  No session object found");
  }
  next();
});

// Environment variables validation
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
  console.warn("🔧 OAuth functionality will not work properly");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: dbConnected ? "connected" : "disconnected",
    sessionStore: sessionStore ? "configured" : "memory",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check environment
app.get("/debug/env", (req, res) => {
  res.json({
    hasOAuthConfig: !!(OAUTH_AUTHORIZE_URL && CLIENT_ID && REDIRECT_URI),
    hasFrontendUrl: !!FRONTEND_VOICE_URL,
    redirectUri: REDIRECT_URI,
    frontendUrl: FRONTEND_VOICE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
});

// Start endpoint with detailed error handling
app.get("/start", async (req, res) => {
  console.log("\n🚀 START endpoint called");

  try {
    const cliqUserId = req.query.cliq_user_id;

    if (!cliqUserId) {
      console.error("❌ Missing cliq_user_id parameter");
      return res.status(400).json({
        error: "Missing cliq_user_id parameter",
        received_query: req.query,
      });
    }

    console.log(`👤 Processing user: ${cliqUserId}`);

    if (!dbConnected) {
      console.warn("⚠️  Database not connected, skipping token check");
      req.session.cliq_user_id = cliqUserId;
      await req.session.save();
      console.log("💾 Session saved with cliq_user_id");
      return res.redirect("/auth/login");
    }

    // Check for existing OAuth token
    console.log("🔍 Querying MongoDB for existing token...");
    const existingToken = await OAuthToken.findOne({
      external_user_id: cliqUserId,
      provider: "Zoho",
    });

    if (existingToken) {
      console.log("✅ Found existing token:", existingToken._id);
      console.log("📊 Token expires_at:", existingToken.expires_at);
      console.log("📊 Token created:", existingToken.createdAt);

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (existingToken.expires_at && existingToken.expires_at < now) {
        console.log("⏰ Token expired, deleting...");
        await OAuthToken.deleteOne({ _id: existingToken._id });
      } else {
        console.log("🎉 Valid token found, redirecting to voice UI");

        if (!FRONTEND_VOICE_URL) {
          console.error("❌ FRONTEND_VOICE_URL not configured");
          console.error(
            "❌ Available env:",
            Object.keys(process.env).filter((k) => k.includes("FRONT"))
          );
          return res.status(500).json({
            error: "FRONTEND_VOICE_URL not configured",
            cliq_user_id: cliqUserId,
          });
        }

        const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
          cliqUserId
        )}`;
        console.log(`🔀 Redirecting to frontend: ${redirectUrl}`);
        return res.redirect(redirectUrl);
      }
    } else {
      console.log("ℹ️  No existing token found for user:", cliqUserId);
    }

    // No valid token, start OAuth flow
    console.log("🔐 No valid token, starting OAuth flow");
    req.session.cliq_user_id = cliqUserId;

    // Explicitly save session before redirect
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          reject(err);
        } else {
          console.log("💾 Session saved successfully");
          resolve();
        }
      });
    });

    return res.redirect("/auth/login");
  } catch (err) {
    console.error("💥 START endpoint error:");
    console.error("  Message:", err.message);
    console.error("  Stack:", err.stack);
    console.error("  Name:", err.name);

    if (err.response) {
      console.error("  Response data:", err.response.data);
      console.error("  Response status:", err.response.status);
    }

    return res.status(500).json({
      error: "Start endpoint failed",
      message: err.message,
      type: err.name,
    });
  }
});

// Login endpoint
app.get("/auth/login", async (req, res) => {
  console.log("\n🔐 LOGIN endpoint called");

  try {
    // Check if required env vars are present
    if (!OAUTH_AUTHORIZE_URL || !CLIENT_ID || !REDIRECT_URI) {
      console.error("❌ Missing OAuth configuration");
      return res.status(500).send("OAuth not properly configured");
    }

    const state = uuidv4();
    console.log(`🎲 Generated state: ${state.slice(0, 8)}...`);

    // Handle cliq_user_id from query or session
    const cliqUserId = req.query.cliq_user_id || req.session.cliq_user_id;

    if (cliqUserId) {
      req.session.cliq_user_id = cliqUserId;
      console.log(`👤 Stored cliq_user_id in session: ${cliqUserId}`);
    } else {
      console.warn("⚠️  No cliq_user_id available");
    }

    req.session.oauth_state = state;

    // Save session before redirect
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          reject(err);
        } else {
          console.log("💾 Session saved with oauth_state");
          resolve();
        }
      });
    });

    const url = new URL(OAUTH_AUTHORIZE_URL);
    url.searchParams.append("client_id", CLIENT_ID);
    url.searchParams.append("scope", SCOPE);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", REDIRECT_URI);
    url.searchParams.append("state", state);
    url.searchParams.append("access_type", "offline");

    console.log(`🔀 Redirecting to Zoho OAuth:`);
    console.log(`   URL: ${url.toString().slice(0, 100)}...`);

    return res.redirect(url.toString());
  } catch (err) {
    console.error("💥 LOGIN endpoint error:");
    console.error("  Message:", err.message);
    console.error("  Stack:", err.stack);

    return res.status(500).json({
      error: "Login failed",
      message: err.message,
    });
  }
});

// OAuth callback endpoint
app.get("/auth/callback", async (req, res) => {
  console.log("\n🔄 CALLBACK endpoint called");
  console.log("🔍 Full query params:", JSON.stringify(req.query, null, 2));
  console.log("🔍 Session exists:", !!req.session);
  console.log("🔍 Session ID:", req.sessionID);
  console.log("🔍 Full session data:", JSON.stringify(req.session, null, 2));

  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error("❌ OAuth error from provider:");
      console.error("  Error:", error);
      console.error("  Description:", error_description);
      return res
        .status(400)
        .send(`OAuth Error: ${error} - ${error_description}`);
    }

    if (!code) {
      console.error("❌ No authorization code received");
      console.error("❌ Query params:", req.query);
      return res.status(400).send("No authorization code received");
    }
    // Validate state
    if (!req.session || !req.session.oauth_state) {
      console.error("❌ Session lost or oauth_state missing!");
      console.error("  Session exists:", !!req.session);
      console.error("  Session oauth_state:", req.session?.oauth_state);
      console.error("  Received state:", state);
      return res
        .status(400)
        .send(
          "Session lost during OAuth flow. Please try again from the beginning."
        );
    }

    if (!state || state !== req.session.oauth_state) {
      console.error("❌ OAuth state mismatch!");
      console.error("  Received:", state);
      console.error("  Expected:", req.session.oauth_state);
      return res.status(400).send("Invalid OAuth state - possible CSRF attack");
    }

    console.log("✅ State validation passed");

    // Exchange code for tokens
    console.log("🔄 Exchanging code for tokens...");
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

    console.log("✅ Token exchange successful");
    const tokenData = tokenRes.data;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    console.log("📊 Token info:");
    console.log("  Access Token:", accessToken ? "received" : "missing");
    console.log("  Refresh Token:", refreshToken ? "received" : "missing");
    console.log("  Expires In:", expiresIn, "seconds");

    // Fetch user profile
    let userProfile = null;
    try {
      console.log("👤 Fetching user profile...");
      const profileRes = await axios.get(OAUTH_USERINFO_URL, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      userProfile = profileRes.data;
      console.log(
        "✅ User profile received:",
        JSON.stringify(userProfile, null, 2)
      );
    } catch (e) {
      console.warn("⚠️  Couldn't fetch user profile:", e.message);
    }

    const cliqUserId = req.session.cliq_user_id || null;

    if (!cliqUserId) {
      console.error("❌ No cliq_user_id in session!");
      console.error("❌ Full session:", JSON.stringify(req.session, null, 2));
      return res
        .status(400)
        .send(
          "Session lost - no user ID found. Please try again from the beginning."
        );
    }

    console.log(`👤 Saving token for user: ${cliqUserId}`);

    // Save token to MongoDB
    const oauthData = {
      provider: "Zoho",
      external_user_id: cliqUserId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null,
      scope: SCOPE,
      profile: userProfile,
    };

    const saved = await OAuthToken.findOneAndUpdate(
      { external_user_id: cliqUserId, provider: "Zoho" },
      oauthData,
      { upsert: true, new: true, runValidators: true }
    );

    console.log("✅ OAuth token saved to MongoDB:", saved._id);

    // Clean up session
    delete req.session.oauth_state;
    delete req.session.cliq_user_id;

    await new Promise((resolve) => {
      req.session.save(() => resolve());
    });

    // Redirect to frontend
    if (!FRONTEND_VOICE_URL) {
      console.error("❌ FRONTEND_VOICE_URL not configured");
      console.error(
        "❌ Available env vars:",
        Object.keys(process.env).filter((k) => k.includes("FRONT"))
      );
      return res.status(500).send("FRONTEND_VOICE_URL not configured");
    }

    const redirectUrl = `${FRONTEND_VOICE_URL}?cliq_user_id=${encodeURIComponent(
      cliqUserId
    )}`;
    console.log(`🎉 OAuth flow completed successfully!`);
    console.log(`🔀 Redirecting to frontend: ${redirectUrl}`);

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("💥 CALLBACK endpoint error:");
    console.error("  Message:", err.message);
    console.error("  Stack:", err.stack);
    console.error("  Error type:", err.constructor.name);

    if (err.response) {
      console.error("  Response Status:", err.response.status);
      console.error(
        "  Response Data:",
        JSON.stringify(err.response.data, null, 2)
      );
    }

    if (axios.isAxiosError(err)) {
      console.error("  Axios Error Details:");
      console.error("    URL:", err.config?.url);
      console.error("    Method:", err.config?.method);
      console.error("    Headers:", err.config?.headers);
    }

    // Send a more user-friendly error page
    return res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>An error occurred during authentication: ${err.message}</p>
          <p><a href="/start?cliq_user_id=${
            req.session?.cliq_user_id || ""
          }">Try again</a></p>
          <details>
            <summary>Technical Details</summary>
            <pre>${err.stack}</pre>
          </details>
        </body>
      </html>
    `);
  }
});

// Test endpoint to verify server is working
app.get("/test", (req, res) => {
  res.send(`
    <html>
      <head><title>Server Test</title></head>
      <body>
        <h1>✅ Server is running!</h1>
        <ul>
          <li>Database: ${dbConnected ? "✅ Connected" : "❌ Disconnected"}</li>
          <li>Session Store: ${
            sessionStore ? "✅ Configured" : "⚠️ Memory"
          }</li>
          <li>Session ID: ${req.sessionID}</li>
          <li>Environment: ${process.env.NODE_ENV || "development"}</li>
        </ul>
        <h2>Available Endpoints:</h2>
        <ul>
          <li><a href="/health">/health</a></li>
          <li><a href="/debug/env">/debug/env</a></li>
          <li><a href="/start?cliq_user_id=test123">/start?cliq_user_id=test123</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Import and use routes
const { default: transcribeRouter } = await import("./routes/voiceroutes.js");
const { default: todoRouter } = await import("./routes/todoRoutes.js");

app.use("/api", transcribeRouter);
app.use("/api/todos", todoRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("\n💥 GLOBAL ERROR HANDLER:");
  console.error("  Message:", err.message);
  console.error("  Stack:", err.stack);
  console.error("  Name:", err.name);

  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin))
  ) {
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
    error: err.message || "Internal Server Error",
    type: err.name,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Server started successfully`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🔐 Session Secret: ${
      process.env.SESSION_SECRET
        ? "configured"
        : "using default (change in production!)"
    }`
  );
  console.log(`🗄️  Database: ${dbConnected ? "connected" : "not connected"}`);
  console.log(`${"=".repeat(60)}\n`);
});

export default app;
