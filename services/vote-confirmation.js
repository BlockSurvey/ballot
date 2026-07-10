/**
 * Poll a vote transaction's status until it confirms, aborts, or times out.
 *
 * Why this exists: in the grouped-poll wizard we can't reload the page after a
 * vote, and a freshly broadcast vote is not yet on-chain — reading results
 * immediately returns the OLD tally. Callers use this to refresh a poll's
 * results only once the vote transaction actually lands.
 *
 * Dependencies are injected so the state machine is unit-testable without a
 * network or real timers.
 *
 * @param {Object} deps
 * @param {() => Promise<string|undefined>} deps.fetchTxStatus - resolves the
 *   tx_status string (e.g. "pending", "success", "abort_by_response"), or
 *   undefined/throws on a transient error (which is retried).
 * @param {(ms:number) => Promise<void>} deps.wait - delay helper.
 * @param {number} [deps.maxAttempts=20]
 * @param {number} [deps.intervalMs=8000]
 * @returns {Promise<"confirmed"|"aborted"|"timeout">}
 */
export async function waitForVoteConfirmation({
    fetchTxStatus,
    wait,
    maxAttempts = 20,
    intervalMs = 8000,
}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await wait(intervalMs);
        try {
            const status = await fetchTxStatus();
            if (status === "success") return "confirmed";
            if (typeof status === "string" && status.startsWith("abort")) return "aborted";
            // Any other value (pending/undefined) — keep polling.
        } catch (error) {
            // Transient network/API error — keep retrying until maxAttempts.
        }
    }
    return "timeout";
}
