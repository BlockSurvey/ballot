import { getKVOrNull } from "../utils/cloudFlareKVClient";

// Basic Stacks address sanity (mainnet SP/SM, testnet ST/SN; Crockford base32).
const STX_ADDRESS_RE = /^S[0-9A-HJKMNP-TV-Z]{37,41}$/;

/**
 * GET /api/members/verify?address=SP...
 *
 * Looks up `verified-member::<address>` in Cloudflare KV and reports whether
 * the poll creator is a trusted/authorized member. Fails closed: any error or
 * missing key returns { verified: false } so we never imply trust we can't prove.
 *
 * KV value may be:
 *   - a JSON object: {"label": "Stacks Foundation", ...} (label shown on the banner)
 *   - a plain string label
 *   - any truthy marker (e.g. "true")
 */
export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const address = (req.query.address || "").toString().trim();
    if (!address || !STX_ADDRESS_RE.test(address)) {
        return res.status(400).json({ error: "A valid Stacks address is required" });
    }

    try {
        const raw = await getKVOrNull(`verified-member::${address}`);

        if (raw === null) {
            return res.status(200).json({ verified: false });
        }

        // Derive an optional human label from the stored value.
        let label;
        try {
            const parsed = JSON.parse(raw);
            label = parsed?.label || parsed?.name || parsed?.org;
        } catch {
            label = raw && raw.toLowerCase() !== "true" ? raw : undefined;
        }

        // Short browser cache to avoid re-querying KV on every render.
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
        return res.status(200).json({ verified: true, label });
    } catch (error) {
        console.error("member verify failed:", error);
        // Fail closed — never imply verification on error.
        return res.status(200).json({ verified: false });
    }
}
