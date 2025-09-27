import { randomBytes } from "crypto";
import { putKV } from "../utils/cloudFlareKVClient";
import { encryptECIES } from "@stacks/encryption";
import { utf8ToBytes } from "@stacks/common";

/**
 * API endpoint to generate a nonce for publicKey authentication
 * The nonce is used for signature verification in the verify endpoint
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { publicKey } = req.body;

    // Validate required fields
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required" });
    }

    // Validate publicKey format (should be hex string)
    if (!/^[a-fA-F0-9]+$/.test(publicKey)) {
      return res.status(400).json({ error: "Invalid publicKey format" });
    }

    // Generate a random nonce (32 bytes = 256 bits)
    const nonce = randomBytes(32).toString("hex");

    // Create expiration time (5 minutes from now)
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store nonce in CloudFlare KV with publicKey as part of the key
    const nonceKey = `nonce::${publicKey}`;
    const nonceData = {
      nonce,
      publicKey,
      expiresAt,
      createdAt: Date.now(),
    };

    // Store the nonce in CloudFlare KV
    await putKV(nonceKey, JSON.stringify(nonceData), {
      expirationTtl: 300, // 5 minutes in seconds
    });

    // Encrypt the nonce using the public key
    const cipherObj = await encryptECIES(
      publicKey,
      utf8ToBytes(JSON.stringify(nonceData)),
      true
    );

    // Return nonce to client
    return res.status(200).json({
      data: {
        encryptedNonce: cipherObj,
      },
    });
  } catch (error) {
    console.error("Error generating nonce:", error);
    return res.status(500).json({
      error: "Failed to generate nonce",
      message: error.message,
    });
  }
}
