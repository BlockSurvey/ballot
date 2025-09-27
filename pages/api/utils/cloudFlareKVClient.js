// CloudFlare KV client
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const NAMESPACE_ID = process.env.CLOUDFLARE_KV_NAMESPACE_ID || "";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;

export async function putKV(key, value, options = {}) {
  const url = `${BASE_URL}/values/${encodeURIComponent(key)}`;

  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "text/plain",
  };

  if (options.expirationTtl) {
    headers["expiration-ttl"] = options.expirationTtl;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: value,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to write KV: ${error}`);
  }

  return true;
}

export async function getKV(key) {
  const url = `${BASE_URL}/values/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to read KV: ${error}`);
  }

  return await res.text();
}

export async function deleteKV(key) {
  const url = `${BASE_URL}/values/${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to delete KV: ${error}`);
  }

  return true;
}
