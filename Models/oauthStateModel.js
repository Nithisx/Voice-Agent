import mongoose from "mongoose";

const oauthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true, index: true },
  cliq_user_id: { type: String },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date },
});

// Optional TTL index to auto-expire state records after e.g. 15 minutes
oauthStateSchema.index({ created_at: 1 }, { expireAfterSeconds: 60 * 15 });

export default mongoose.model("OAuthState", oauthStateSchema);
