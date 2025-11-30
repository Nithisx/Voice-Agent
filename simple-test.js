// Simple token test without starting server
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const base64urlDecode = (s) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();

const failingToken =
  "OTRmNzRkMWQtMzg1Ni00MGFjLThmZTEtN2Q4MWQwNjE3NGRkfDkwNjgxMDY4NHxiMjM5NmNhZGU5YmMyNWU1Mjc4NGQ4OTQyNDhkMDVmMzBiYWUyMjJjZTg5NGQyNTQ1NmQ2Njc0ODk1ZWNiNWU1";

console.log("🧪 Simple token verification test:");
console.log("Current STATE_SECRET:", process.env.STATE_SECRET || "not set");

const decoded = base64urlDecode(failingToken);
const parts = decoded.split("|");
const stateId = parts[0];
const cliqUserId = parts[1];
const receivedMac = parts[2];

const payload = `${stateId}|${cliqUserId}`;
const currentSecret = process.env.STATE_SECRET || "change_this_state_secret";
const expectedMac = crypto
  .createHmac("sha256", currentSecret)
  .update(payload)
  .digest("hex");

console.log("Expected MAC:", expectedMac.substring(0, 16) + "...");
console.log("Received MAC:", receivedMac.substring(0, 16) + "...");
console.log("Match:", expectedMac === receivedMac ? "✅ YES" : "❌ NO");

if (expectedMac === receivedMac) {
  console.log("🎉 Token verification will work!");
} else {
  console.log("❌ Token verification will fail");
}
