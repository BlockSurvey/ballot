#!/usr/bin/env node
/**
 * Generates a fresh snapshot-signer keypair for Ballot's oracle-signed
 * snapshot voting (see docs/snapshot-voting.md).
 *
 * Run ONCE per environment (dev and prod get DIFFERENT keys):
 *     node scripts/gen-snapshot-key.mjs
 *
 * Then copy the two lines it prints into that environment's .env file:
 *   - SNAPSHOT_SIGNER_PRIVATE_KEY        → server-only secret (signs weights)
 *   - NEXT_PUBLIC_SNAPSHOT_SIGNER_PUBKEY → public, embedded into poll contracts
 *
 * Restart the server afterwards — NEXT_PUBLIC_* vars are inlined at start.
 */
import { makeRandomPrivKey, privateKeyToString } from "@stacks/transactions";
import { getPublicKey } from "@noble/secp256k1";

// 1) Random 32-byte private key (strip any trailing "01" compression flag).
let privHex = privateKeyToString(makeRandomPrivKey());
if (privHex.length === 66 && privHex.toLowerCase().endsWith("01")) {
    privHex = privHex.slice(0, 64);
}

// 2) Corresponding COMPRESSED (33-byte) public key — what the contract embeds
//    as SNAPSHOT-SIGNER and verifies signatures against.
const pubHex = Buffer.from(getPublicKey(privHex, true)).toString("hex");

// Sanity checks
if (privHex.length !== 64) {
    throw new Error(`Unexpected private key length: ${privHex.length} (want 64 hex chars)`);
}
if (pubHex.length !== 66 || !/^0[23]/.test(pubHex)) {
    throw new Error(`Unexpected public key: ${pubHex} (want 66 hex chars, compressed 02/03 prefix)`);
}

console.log("\n  Snapshot signer keypair generated.\n");
console.log("  Add these to your environment's .env file (dev and prod differ):\n");
console.log("  # ── server-only secret — NEVER commit or expose to the browser ──");
console.log(`  SNAPSHOT_SIGNER_PRIVATE_KEY=${privHex}\n`);
console.log("  # ── public — embedded into snapshot poll contracts (safe to expose) ──");
console.log(`  NEXT_PUBLIC_SNAPSHOT_SIGNER_PUBKEY=${pubHex}\n`);
console.log("  Then restart the server (NEXT_PUBLIC_* vars are inlined at start).\n");
