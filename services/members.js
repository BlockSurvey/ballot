// Trusted/authorized member verification.
//
// A poll creator is "verified" when `verified-member::<stxAddress>` exists in
// Cloudflare KV. This is the clean client-side entry point; the actual KV read
// happens server-side in /api/members/verify (KV credentials never reach the
// browser). Always resolves — fails closed to { verified: false }.

/**
 * @param {string} stxAddress - the poll creator's Stacks address
 * @returns {Promise<{verified: boolean, label?: string}>}
 */
export async function isVerifiedMember(stxAddress) {
    if (!stxAddress) return { verified: false };

    try {
        const res = await fetch(
            `/api/members/verify?address=${encodeURIComponent(stxAddress)}`
        );
        if (!res.ok) return { verified: false };

        const data = await res.json();
        return { verified: !!data?.verified, label: data?.label };
    } catch (error) {
        // Network/parse failure — never imply verification.
        return { verified: false };
    }
}
