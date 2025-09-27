import { publicKeyToBtcAddress } from "@stacks/encryption";
import { randomBytes } from "crypto";
import { deleteKV, getKV, putKV } from "../utils/cloudFlareKVClient";

/**
 * API endpoint to verify signature and generate API key
 * Validates the signed nonce and creates a long-lived API key stored in KV
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { publicKey, decryptedNonce } = req.body;

    // Validate required fields
    if (!publicKey || !decryptedNonce) {
      return res.status(400).json({
        error: "publicKey and decryptedNonce are required",
      });
    }

    // Retrieve nonce from KV storage
    const nonceKey = `nonce::${publicKey}`;
    const storedNonceData = await getKV(nonceKey);
    // Check if nonce exists
    if (!storedNonceData) {
      return res.status(400).json({
        error: "Invalid or expired nonce. Please request a new nonce.",
      });
    }

    // Parse the nonce data
    const nonceData = JSON.parse(storedNonceData);

    // Verify nonce matches and hasn't expired
    if (nonceData.nonce !== decryptedNonce.nonce) {
      return res.status(400).json({ error: "Nonce mismatch" });
    }

    // Check if the nonce has expired
    if (Date.now() > nonceData.expiresAt) {
      // Clean up expired nonce
      await deleteKV(nonceKey);
      return res.status(400).json({
        error: "Nonce has expired. Please request a new nonce.",
      });
    }

    // Try to get public key data, handle missing key gracefully
    let publicKeyData;
    try {
      publicKeyData = await getKV(`publicKey::${publicKey}`);
    } catch (err) {
      console.log("KV get failed for publicKey::" + publicKey, err);
      publicKeyData = null;
    }
    if (publicKeyData) {
      // Get the API key
      const apiKey = JSON.parse(publicKeyData).apiKey;

      // Return API key to client
      return res.status(200).json({
        data: {
          apiKey,
        },
      });
    }

    // Generate API key
    const apiKey = randomBytes(32).toString("hex");

    // Generate gaia address from public key for identification
    const gaiaAddress = publicKeyToBtcAddress(publicKey);

    // Store API key in KV
    const apiKeyData = {
      apiKey,
      publicKey,
      gaiaAddress,
      createdAt: Date.now(),
    };

    // Store API key in KV
    await Promise.all([
      putKV(`publicKey::${publicKey}`, JSON.stringify(apiKeyData)),
      putKV(`apiKey::${apiKey}`, JSON.stringify(apiKeyData)),
    ]);

    // Clean up the used nonce
    await deleteKV(nonceKey);

    // Return API key to client
    return res.status(200).json({
      data: {
        apiKey,
      },
    });
  } catch (error) {
    console.error("Error verifying signature:", error);
    return res.status(500).json({
      error: "Failed to verify signature",
      message: error.message,
    });
  }
}
