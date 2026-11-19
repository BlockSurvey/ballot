import { Constants } from '../common/constants';

/**
 * STX balance reads from the Stacks node's consensus state.
 *
 * Replaces the deprecated Hiro v1 `/extended/v1/address/{a}/stx?until_block=`:
 * Hiro is sunsetting v1 (intermittent 429s, then 410) and its historical query
 * reports `locked: 0` for PoX-5 stakes. Hiro v3 balances have no historical
 * parameter at all, so a snapshot read has to go through the node RPC with
 * `?tip=<index_block_hash>`.
 *
 * Kept dependency-free (constants only) so it works in the browser, in API
 * routes and in plain Node scripts.
 */

const MICRO_STX = BigInt(1000000);

// Mainnet: keyed Hiro first, QuickNode as fallback. Testnet: Hiro only.
const getProviders = () => {
    const hiroHeaders = { "x-api-key": Constants.STACKS_API_KEY, "Accept": "application/json" };
    if (!Constants.STACKS_MAINNET_FLAG) {
        return [{ baseUrl: Constants.STACKS_TESTNET_API_URL, headers: hiroHeaders, timeoutMs: 10000 }];
    }
    return [
        { baseUrl: Constants.STACKS_MAINNET_API_URL, headers: hiroHeaders, timeoutMs: 8000 },
        { baseUrl: Constants.STACKS_QUICKNODE_API_URL, headers: { "Accept": "application/json" }, timeoutMs: 15000 },
    ];
};

// GET a Stacks API path as JSON, trying each provider in order. Throws the
// last error when every provider fails (non-2xx, timeout or network error).
const fetchStacksJson = async (path) => {
    let lastError;
    for (const { baseUrl, headers, timeoutMs } of getProviders()) {
        try {
            const response = await fetch(`${baseUrl}${path}`, {
                headers,
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

// Stacks block height -> index_block_hash (no 0x). A confirmed block's hash
// never changes, so each height is resolved once per page/lambda. The promise
// is cached so concurrent callers share one request; failures are not cached.
const indexBlockHashCache = new Map();

export const getIndexBlockHash = (height) => {
    const key = String(height);
    if (!indexBlockHashCache.has(key)) {
        const pending = fetchStacksJson(`/extended/v2/blocks/${key}`)
            .then((block) => {
                const hash = String(block?.index_block_hash || "").replace(/^0x/, "");
                if (!/^[0-9a-f]{64}$/i.test(hash)) {
                    throw new Error(`No index_block_hash for Stacks block ${key}`);
                }
                return hash;
            })
            .catch((error) => {
                indexBlockHashCache.delete(key);
                throw error;
            });
        indexBlockHashCache.set(key, pending);
    }
    return indexBlockHashCache.get(key);
};

/**
 * STX balance of `address` at Stacks block `blockHeight` (or at the chain tip
 * when no height is given), in whole STX.
 *
 * `locked` and `unlocked` are floored separately and `total` is their sum —
 * the same arithmetic as /api/snapshot/sign, so the result equals the voting
 * power the poll contract records. Throws when the balance can't be read;
 * callers decide how to degrade (never treat a failure as a zero balance).
 */
export const getStxBalanceAtBlock = async (address, blockHeight = null) => {
    const tip = blockHeight ? await getIndexBlockHash(blockHeight) : null;
    const account = await fetchStacksJson(
        `/v2/accounts/${address}?proof=0${tip ? `&tip=${tip}` : ""}`
    );
    if (typeof account?.balance !== "string" || typeof account?.locked !== "string") {
        throw new Error(`Unexpected account response for ${address}`);
    }

    // The node reports hex µSTX; `balance` is the UNLOCKED part only.
    const locked = Number(BigInt(account.locked) / MICRO_STX);
    const unlocked = Number(BigInt(account.balance) / MICRO_STX);
    return { locked, unlocked, total: locked + unlocked };
};
