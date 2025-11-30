import mongoose from "mongoose";

const oauthSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  external_user_id: { type: String, required: true, index: true },
  access_token: { type: String, required: true },
  refresh_token: { type: String },
  expires_at: { type: Number }, // unix timestamp
  scope: { type: String },
  created_at: { type: Date, default: Date.now },
  profile: { type: mongoose.Schema.Types.Mixed },
});

export default mongoose.model("OAuthToken", oauthSchema);
