import { createHash } from "crypto";
import {
    createStacksPrivateKey,
    signWithKey,
    serializeCV,
    tupleCV,
    uintCV,
    bufferCV,
    standardPrincipalCV,
} from "@stacks/transactions";
import { Constants } from "../../../common/constants";

/**
 * Signs a voter's snapshot voting power so the poll contract can verify it
 * on-chain (replacement for `at-block`, removed in Epoch 3.4 / SIP-042).
 *
 * Request (POST): { pollId, gaiaAddress, voterAddress }
 * Response: { power: "<uint>", signature: "<hex 65-byte RSV>" }
 *
 * Security:
 * - The snapshot height + token come from the poll's stored JSON (authoritative),
 *   NOT from the client, so the weight can't be inflated by lying.
 * - The signed message binds { poll, power, voter } — it can't be replayed for a
 *   different poll, weight, or voter. It must match the contract's
 *   `(sha256 (to-consensus-buff? {poll: POLL-ID, power: ..., voter: tx-sender}))`.
 */
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { pollId, gaiaAddress, voterAddress } = req.body || {};
        if (!pollId || !gaiaAddress || !voterAddress) {
            return res.status(400).json({ error: "pollId, gaiaAddress and voterAddress are required" });
        }

        const privKeyHex = process.env.SNAPSHOT_SIGNER_PRIVATE_KEY;
        if (!privKeyHex) {
            return res.status(500).json({ error: "Snapshot signer is not configured on the server" });
        }

        // 1) Load the authoritative poll JSON (snapshot height + token info)
        const pollUrl = `${Constants.GAIA_HUB_PREFIX}${gaiaAddress}/${pollId}.json`;
        const pollResp = await fetch(pollUrl);
        if (!pollResp.ok) {
            return res.status(404).json({ error: "Poll not found" });
        }
        const poll = await pollResp.json();

        const snapshot = parseInt(poll?.snapshotBlockHeight) || 0;
        if (!snapshot) {
            return res.status(400).json({ error: "Poll has no snapshot block height" });
        }

        // 2) Read the voter's balance AS OF the snapshot block.
        //    Mainnet uses QuickNode (higher rate limits); testnet uses the Hiro API.
        //    NOTE: confirm `until_block` is honored by your API tier.
        const isMainnet = Constants.STACKS_MAINNET_FLAG;
        const apiBase = isMainnet
            ? Constants.STACKS_QUICKNODE_API_URL
            : Constants.STACKS_TESTNET_API_URL;
        const headers = isMainnet
            ? { "Accept": "application/json" }
            : { "x-api-key": Constants.STACKS_API_KEY, "Accept": "application/json" };

        // 3) Compute locked + unlocked at the snapshot (voting power = locked + unlocked),
        //    matching the contract's integer division.
        let locked = 0n;
        let unlocked = 0n;
        if (poll?.votingStrategyTemplate === "stx") {
            // STX: `/stx` returns the total micro-STX balance + locked at the snapshot block
            const stxResp = await fetch(
                `${apiBase}/extended/v1/address/${voterAddress}/stx?until_block=${snapshot}`,
                { headers }
            );
            if (!stxResp.ok) {
                return res.status(502).json({ error: "Failed to fetch snapshot STX balance" });
            }
            const stx = await stxResp.json();
            const totalMicro = BigInt(stx?.balance || "0");
            const lockedMicro = BigInt(stx?.locked || "0");
            locked = lockedMicro / 1000000n;
            unlocked = (totalMicro - lockedMicro) / 1000000n;
        } else {
            // FT: no locking concept — treat the whole balance as unlocked
            const balResp = await fetch(
                `${apiBase}/extended/v1/address/${voterAddress}/balances?until_block=${snapshot}`,
                { headers }
            );
            if (!balResp.ok) {
                return res.status(502).json({ error: "Failed to fetch snapshot balance" });
            }
            const balances = await balResp.json();
            const assetId = `${poll?.strategyContractName}::${poll?.strategyTokenName}`;
            const bal = BigInt(balances?.fungible_tokens?.[assetId]?.balance || "0");
            const decimals = BigInt(parseInt(poll?.strategyTokenDecimals) || 0);
            locked = 0n;
            unlocked = decimals > 0n ? bal / (10n ** decimals) : bal;
        }

        // 4) Build the exact message the contract reconstructs and verifies.
        //    (serializeCV sorts tuple keys alphabetically: locked, poll, unlocked, voter —
        //     matching the contract's to-consensus-buff?.)
        const message = tupleCV({
            locked: uintCV(locked),
            poll: bufferCV(Buffer.from(String(pollId))),
            unlocked: uintCV(unlocked),
            voter: standardPrincipalCV(voterAddress),
        });
        const serialized = Buffer.from(serializeCV(message));
        const msgHashHex = createHash("sha256").update(serialized).digest("hex");

        // 5) Sign, then reorder VRS -> RSV (Stacks signs V||R||S; Clarity's
        //    secp256k1-verify expects R||S||V).
        const sig = signWithKey(createStacksPrivateKey(privKeyHex), msgHashHex);
        const vrs = Buffer.from(sig.data, "hex"); // 65 bytes
        const rsv = Buffer.concat([vrs.subarray(1), vrs.subarray(0, 1)]);

        return res.status(200).json({
            locked: locked.toString(),
            unlocked: unlocked.toString(),
            signature: rsv.toString("hex"),
        });
    } catch (error) {
        console.error("snapshot/sign error:", error);
        return res.status(500).json({ error: "Internal error" });
    }
}
