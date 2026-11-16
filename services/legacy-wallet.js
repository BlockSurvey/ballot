// Legacy (pre-SIP-030) wallet protocol fallback.
//
// WHY THIS EXISTS: Leather's Firefox add-on was withdrawn by its developer, so
// Firefox users are frozen on an old build (v6.0–6.8, late 2023). Those builds
// only answer the RPC methods getAddresses / signMessage(BTC) / sendTransfer /
// signPsbt — `stx_signMessage`, `stx_callContract`, `stx_deployContract` and
// `stx_transferStx` all fail with JSON-RPC -32601 "is not supported". They DO
// still implement the original JWT-token API on the provider object:
//   provider.signatureRequest(token)   → { signature, publicKey }
//   provider.transactionRequest(token) → { txId, txRaw }
// (verified against leather-io/extension v6.5.0 source).
//
// Identity safety: legacy message signing in those builds is
// signMessageHashRsv(hashMessage(msg)) with the "\x17Stacks Signed Message:\n"
// prefix — byte-identical to what `stx_signMessage` does in newer Leather.
// RFC6979 makes it deterministic, so the signature-derived app key (and thus
// the Gaia address all polls live under) is the SAME on Firefox and Chrome.
import { getLocalStorage, getSelectedProvider } from "@stacks/connect";
import { Constants } from "../common/constants";

// JSON-RPC "method not found" (-32601). Leather phrases it as
// '"<method>" is not supported. Try running…'. Keep this narrow: a loose
// /not supported/ would also catch unrelated wallet errors (e.g. "network not
// supported") and wrongly divert them to the legacy API.
export function isUnsupportedMethodError(error) {
  return (
    error?.code === -32601 ||
    /^"[\w.]+" is not supported/.test(error?.message || "") ||
    /method not found/i.test(error?.message || "")
  );
}

function base64UrlJson(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Same shape as jsontokens' createUnsecuredToken (alg "none", empty signature).
// The wallet only decodes it (decodeToken) — it never verifies a signature.
function createUnsecuredToken(payload) {
  return `${base64UrlJson({ typ: "JWT", alg: "none" })}.${base64UrlJson(payload)}.`;
}

// The legacy wallet matches the request to one of its networks by
// coreApiUrl / chainId (and offers to switch if needed).
function legacyNetwork(network) {
  return network === "mainnet"
    ? { coreApiUrl: Constants.STACKS_MAINNET_API_URL, chainId: 1 }
    : { coreApiUrl: Constants.STACKS_TESTNET_API_URL, chainId: 2147483648 };
}

function appDetails() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ballot.gg";
  return { name: "Ballot.gg", icon: `${origin}/favicon.ico` };
}

// Address of the connected account as the WALLET encodes it (its current
// network). Old Leather uses it to pick which account signs.
function connectedStxAddress() {
  try {
    return getLocalStorage()?.addresses?.stx?.[0]?.address || undefined;
  } catch (_) {
    return undefined;
  }
}

function legacyProvider(fnName) {
  try {
    const provider = getSelectedProvider();
    return provider && typeof provider[fnName] === "function" ? provider : null;
  } catch (_) {
    return null;
  }
}

// Old wallets reject with the bare string "cancel"; normalize to the error
// shape the rest of the app understands as a user dismissal.
function normalizeCancel(error) {
  if (error === "cancel") {
    const e = new Error("User canceled the request");
    e.code = 4001;
    return e;
  }
  return error;
}

export function supportsLegacySignature() {
  return !!legacyProvider("signatureRequest");
}

export async function legacySignMessage({ message, network, stxAddress }) {
  const provider = legacyProvider("signatureRequest");
  if (!provider) throw new Error("Wallet has no legacy signatureRequest API");
  const token = createUnsecuredToken({
    message,
    stxAddress: stxAddress || connectedStxAddress(),
    network: legacyNetwork(network),
    appDetails: appDetails(),
  });
  try {
    return await provider.signatureRequest(token); // { signature, publicKey }
  } catch (error) {
    throw normalizeCancel(error);
  }
}

// Map a SIP-030 request (as Ballot sends it) to the legacy transaction payload.
// Returns null for methods with no legacy equivalent.
function toLegacyTxPayload(method, params) {
  const base = {
    stxAddress: connectedStxAddress(),
    network: legacyNetwork(params?.network),
    appDetails: appDetails(),
  };
  switch (method) {
    case "stx_callContract": {
      const [contractAddress, contractName] = String(params.contract).split(".");
      return {
        ...base,
        txType: "contract_call",
        contractAddress,
        contractName,
        functionName: params.functionName,
        // Ballot passes cvToHex() output ("0x…"). Old Leather's cleanHex() is
        // buggy (`x !== 'string'` → never strips the prefix), and
        // Buffer.from("0x…", "hex") silently yields an EMPTY buffer — so the
        // prefix MUST be removed here or every arg deserializes to garbage.
        functionArgs: (params.functionArgs || []).map((arg) =>
          typeof arg === "string" ? arg.replace(/^0x/i, "") : arg
        ),
        postConditions: params.postConditions || [],
        ...(params.postConditionMode !== undefined && { postConditionMode: params.postConditionMode }),
      };
    }
    case "stx_deployContract":
      return {
        ...base,
        txType: "smart_contract",
        contractName: params.name,
        codeBody: params.clarityCode,
        postConditions: params.postConditions || [],
      };
    case "stx_transferStx":
      return {
        ...base,
        txType: "token_transfer",
        recipient: params.recipient,
        amount: String(params.amount),
        memo: params.memo || "",
      };
    default:
      return null;
  }
}

// Returns the SIP-030-shaped `{ txid }` result, or null when this method/wallet
// combination can't be served by the legacy API (caller rethrows the original).
export async function legacyTransactionRequest(method, params) {
  const provider = legacyProvider("transactionRequest");
  const payload = toLegacyTxPayload(method, params);
  if (!provider || !payload) return null;
  try {
    const result = await provider.transactionRequest(createUnsecuredToken(payload));
    return { txid: result?.txId, txId: result?.txId, transaction: result?.txRaw };
  } catch (error) {
    throw normalizeCancel(error);
  }
}
