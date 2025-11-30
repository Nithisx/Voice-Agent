// Debug script to analyze the failing state token
import crypto from "crypto";

const base64urlDecode = (s) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();

// The failing state token from your error
const failingToken =
  "OTRmNzRkMWQtMzg1Ni00MGFjLThmZTEtN2Q4MWQwNjE3NGRkfDkwNjgxMDY4NHxiMjM5NmNhZGU5YmMyNWU1Mjc4NGQ4OTQyNDhkMDVmMzBiYWUyMjJjZTg5NGQyNTQ1NmQ2Njc0ODk1ZWNiNWU1";

console.log("🔍 Analyzing failing state token:");
console.log("Token length:", failingToken.length);

try {
  const decoded = base64urlDecode(failingToken);
  console.log("✅ Successfully decoded token:");
  console.log("Decoded content:", decoded);

  const parts = decoded.split("|");
  console.log("📊 Parts count:", parts.length);

  if (parts.length >= 3) {
    const stateId = parts[0];
    const cliqUserId = parts[1];
    const mac = parts[2];

    console.log("📋 Token structure:");
    console.log("  - State ID:", stateId);
    console.log("  - Cliq User ID:", cliqUserId);
    console.log("  - MAC:", mac.substring(0, 16) + "...");

    // Try to verify with different possible secrets
    const possibleSecrets = [
      "change_this_state_secret",
      "change_this_in_production",
    ];

    console.log("\n🔐 Testing MAC verification with common secrets:");

    possibleSecrets.forEach((secret) => {
      const payload = `${stateId}|${cliqUserId}`;
      const expectedMac = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      const matches = expectedMac === mac;

      console.log(
        `Secret "${secret}": ${matches ? "✅ MATCH" : "❌ NO MATCH"}`
      );
      if (!matches) {
        console.log(`  Expected: ${expectedMac.substring(0, 16)}...`);
        console.log(`  Received: ${mac.substring(0, 16)}...`);
      }
    });
  } else {
    console.log("❌ Invalid token structure - not enough parts");
  }
} catch (error) {
  console.error("❌ Failed to decode token:", error.message);
}
