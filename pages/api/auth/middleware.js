import { getKV } from "../utils/cloudFlareKVClient";

export async function validateApiKey(apiKey) {
  try {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    // Remove 'Bearer ' prefix if present
    const cleanApiKey = apiKey.replace(/^Bearer\s+/, "");

    // Look up API key in KV storage
    const apiKeyData = await getKV(`apiKey::${cleanApiKey}`);

    if (!apiKeyData) {
      throw new Error("Invalid API key");
    }

    const keyData = JSON.parse(apiKeyData);

    return keyData;
  } catch (error) {
    throw new Error("Invalid API key");
  }
}
