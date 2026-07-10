import { bytesToHex, utf8ToBytes } from "@stacks/common";
// SINGLE package (@stacks/connect v8) for the whole wallet story:
// - `connect()` (SIP-030) selects + authorizes the wallet; the SAME connection
//   signs transactions via `request()` in services/contract.js.
// - The app private key that storage encryption / BlockSurvey API auth need:
//   * Xverse: `request('stx_getAccounts')` returns it as `gaiaAppKey` — the
//     historical Gaia key, so pre-migration encrypted data stays readable.
//   * Leather: the 2026 extension rewrite removed BOTH stx_getAccounts and the
//     legacy JWT auth handshake (v8's exported `authenticate` is only a
//     getAddresses shim — it never returns an appPrivateKey), so the historical
//     Gaia key is unrecoverable from the wallet. Instead:
//       1. reuse the old key from a pre-migration `blockstack-session` in
//          localStorage when one survives (seamless for returning browsers);
//       2. otherwise derive a deterministic key from a `stx_signMessage`
//          signature (RFC6979: same account + same message ⇒ same signature ⇒
//          same key on every login).
import {
  clearLocalStorage as v8ClearLocalStorage,
  connect as v8Connect,
  disconnect as v8Disconnect,
  isConnected as v8IsConnected,
  request as v8Request,
} from "@stacks/connect";
import {
  decryptECIES,
  encryptECIES,
  getPublicKeyFromPrivate,
  hashSha256Sync,
  publicKeyToBtcAddress,
} from "@stacks/encryption";
import { c32address, c32addressDecode } from "c32check";
import { Constants } from "../common/constants";

// Set this to true if you want to use Mainnet
const stacksMainnetFlag = Constants.STACKS_MAINNET_FLAG;

// ---------------------------------------------------------------------------
// Session — backed by the single v8 connection. Holds the account's address,
// publicKey and gaiaAppKey (used as `appPrivateKey` everywhere downstream).
// ---------------------------------------------------------------------------
const SESSION_KEY = "ballot-session";
let sessionData = null;

function loadSession() {
  if (sessionData) return sessionData;
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    sessionData = raw ? JSON.parse(raw) : null;
  } catch (_) {
    sessionData = null;
  }
  return sessionData;
}

function saveSession(data) {
  sessionData = data;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }
}

function clearSession() {
  sessionData = null;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

// connect v8 only returns the WALLET's current network's address (SP… or ST…).
// If the wallet sits on the other network than the app, every downstream API
// read would 404 — but SP/ST encode the same key with a different version
// byte, so re-encode to the app's network. (The pre-v8 auth returned both
// encodings and the app picked; this restores that behavior.)
const C32_VERSION = {
  mainnet: { p2pkh: 22, p2sh: 20 },
  testnet: { p2pkh: 26, p2sh: 21 },
};
function encodeAddressForNetwork(address, network) {
  try {
    const [version, hash160] = c32addressDecode(address);
    const isP2sh = version === C32_VERSION.mainnet.p2sh || version === C32_VERSION.testnet.p2sh;
    const target = C32_VERSION[network][isP2sh ? "p2sh" : "p2pkh"];
    return c32address(target, hash160);
  } catch (_) {
    return address; // leave unrecognized formats untouched
  }
}

// Shape downstream code (getUserData/getMyStxAddress/encryption) expects, mapping
// the wallet's gaiaAppKey onto the historical `appPrivateKey` field.
// Populate BOTH network encodings (SP…/ST… are the same key, different version
// byte): a session created while the app pointed at one network must not make
// getMyStxAddress() return undefined after the flag/env changes — that
// undefined used to crash eligibility checks and vote-arg derivation.
function userDataFromSession(s) {
  const stxAddress = {
    mainnet: encodeAddressForNetwork(s.address, "mainnet"),
    testnet: encodeAddressForNetwork(s.address, "testnet"),
  };
  return { appPrivateKey: s.appPrivateKey, profile: { stxAddress } };
}

// Compatibility shim: components across the app call userSession.isUserSignedIn()
// etc. Keep that surface identical, now backed by the v8-derived session so no
// component needs to change.
export const userSession = {
  isUserSignedIn: () => !!loadSession()?.appPrivateKey,
  isSignInPending: () => false, // v8 request() is promise-based; no pending handshake
  loadUserData: () => {
    const s = loadSession();
    if (!s) throw new Error("User not signed in");
    return userDataFromSession(s);
  },
  signUserOut: () => clearSession(),
};

export function getUserData() {
  const s = loadSession();
  if (!s) throw new Error("User not signed in");
  return userDataFromSession(s);
}

export function alreadyLoggedIn() {
  // Secure the pre-migration key on first page view, before login even happens.
  backupLegacyAppKey();
  if (userSession.isUserSignedIn()) {
    window.location.assign("/all-polls");
  }
}

// One wallet connection: select+approve the provider (populates the v8 address
// store so contract.js sees isConnected()), then read the full account incl.
// gaiaAppKey. Persists a Ballot session. Returns null if the user dismisses it.
async function connectAndLoadAccount() {
  // ALWAYS force wallet selection at login. A cached connection may point at a
  // different wallet than the user wants to sign in with (e.g. Leather cached,
  // user wants Xverse) — silently reusing it both hides the selector AND binds
  // the session to the wrong wallet.
  console.log("[ballot-auth] step 1: selecting wallet (stale connection cleared:", v8IsConnected(), ")");
  try {
    if (v8IsConnected()) v8Disconnect();
  } catch (_) { /* proceed to a fresh connect regardless */ }
  // Wallet selector + approval; caches provider + addresses. The response holds
  // the current network's addresses — keep it for the Leather key-derivation
  // path so we don't need another wallet round-trip.
  const connectResponse = await v8Connect();

  const network = getNetworkString();

  // Preferred path (Xverse & SIP-030 wallets): one call returns address,
  // publicKey and the gaiaAppKey used as the app private key.
  try {
    console.log("[ballot-auth] step 2: connected, requesting stx_getAccounts…");
    const res = await v8Request("stx_getAccounts", { network });
    const account = res?.accounts?.[0];
    console.log("[ballot-auth] step 3: accounts =", res?.accounts?.length, "| gaiaAppKey present =", !!account?.gaiaAppKey);
    if (account?.gaiaAppKey) {
      const session = {
        address: encodeAddressForNetwork(account.address, network),
        publicKey: account.publicKey,
        appPrivateKey: account.gaiaAppKey,
        gaiaHubUrl: account.gaiaHubUrl,
        network,
      };
      saveSession(session);
      console.log("[ballot-auth] step 4: session saved for", account.address);
      return session;
    }
    // Account came back without the key — fall through to signature derivation.
  } catch (error) {
    // e.g. Leather: JsonRpcError '"stx_getAccounts" is not supported'
    console.warn("[ballot-auth] stx_getAccounts unavailable, deriving app key from signature:", error?.message);
  }

  return signatureDerivedSession(network, connectResponse);
}

// Fixed message signed at login to derive the app key. NEVER change this text:
// the key is sha256(signature-of-this-message), so any edit rotates every
// Leather user's encryption key and orphans their stored data.
const APP_KEY_MESSAGE =
  "Ballot.gg app key v1\n\nSigning this message generates your private encryption key for poll data. It costs nothing and sends no transaction.";

// Fallback for wallets that can't return the Gaia app key (Leather). Prefer the
// original key from a pre-migration localStorage session so old encrypted data
// stays readable; otherwise derive a stable key from a message signature.
async function signatureDerivedSession(network, connectResponse) {
  // The connect() response is the current network's account list.
  const stxAccount = connectResponse?.addresses?.find(
    (entry) => entry?.symbol === "STX" || entry?.address?.startsWith("S")
  );
  if (!stxAccount?.address) {
    throw new Error("Wallet did not return a Stacks address");
  }

  let appPrivateKey = recoverPreMigrationAppKey();
  if (appPrivateKey) {
    console.log("[ballot-auth] reusing app key from pre-migration session");
  } else {
    console.log("[ballot-auth] requesting stx_signMessage to derive app key…");
    const res = await v8Request("stx_signMessage", { message: APP_KEY_MESSAGE });
    if (!res?.signature) {
      throw new Error("Wallet did not return a signature for key derivation");
    }
    appPrivateKey = bytesToHex(hashSha256Sync(utf8ToBytes(res.signature)));
  }

  const session = {
    address: encodeAddressForNetwork(stxAccount.address, network),
    publicKey: stxAccount.publicKey || null,
    appPrivateKey,
    gaiaHubUrl: null,
    network,
  };
  saveSession(session);
  console.log("[ballot-auth] signature-derived session saved for", stxAccount.address);
  return session;
}

// The pre-v8 site kept the Gaia-derived appPrivateKey in localStorage under
// @stacks/auth's `blockstack-session`. If it's still there, reusing it keeps
// the user's previously encrypted polls readable and their storage address
// unchanged — the wallet itself can no longer produce this key (new Leather
// removed every API that returned it), so this localStorage entry is the ONLY
// remaining copy. Guard it: copy it into our own durable slot the moment we
// see it, so no library upgrade or session-clearing can destroy it later.
const LEGACY_KEY_BACKUP = "ballot-legacy-app-key";

export function backupLegacyAppKey() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (window.localStorage.getItem(LEGACY_KEY_BACKUP)) return; // already saved
    const raw = window.localStorage.getItem("blockstack-session");
    const key = raw ? JSON.parse(raw)?.userData?.appPrivateKey : null;
    if (key && typeof key === "string") {
      window.localStorage.setItem(LEGACY_KEY_BACKUP, key);
    }
  } catch (_) {
    // corrupt legacy session — nothing to back up
  }
}

function recoverPreMigrationAppKey() {
  try {
    backupLegacyAppKey();
    return window.localStorage.getItem(LEGACY_KEY_BACKUP) || null;
  } catch (_) {
    return null;
  }
}

// Fully drop the v8 connection + Ballot session (account change / sign-out).
function disconnectWallet() {
  clearSession();
  if (typeof window === "undefined") return;
  try {
    if (v8IsConnected()) v8Disconnect();
    v8ClearLocalStorage();
  } catch (_) {
    // Already clear / unavailable — nothing to do.
  }
}

/**
 * Sign in — single wallet connection covering identity, storage key and signing.
 */
export async function authenticate(redirectTo) {
  backupLegacyAppKey(); // secure the pre-migration key before anything else
  if (userSession.isUserSignedIn()) {
    window.location.assign(redirectTo || "/all-polls");
    return;
  }
  try {
    const account = await connectAndLoadAccount();
    if (!account) return; // dismissed
    window.location.assign(redirectTo || "/all-polls");
  } catch (error) {
    console.error("Sign in failed:", error);
    // Self-heal: drop the (possibly wrong/stale) connection so the next login
    // click always starts from a clean wallet selector instead of wedging.
    disconnectWallet();
  }
}

export async function switchAccount(redirectTo) {
  // Drop the current connection so the wallet re-selects the account, then sign
  // in fresh against that account.
  disconnectWallet();
  return authenticate(redirectTo);
}

/**
 * Sign out
 */
export function signOut(redirectTo) {
  disconnectWallet();
  // If a redirect URL is provided, stay on that page; otherwise go to home
  window.location.assign(redirectTo || "/");
}

/**
 * Save file to BlockSurvey Storage via custom API
 */
export function putFileToGaia(fileName, file, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      let overrideOptions = {};
      if (!options) {
        overrideOptions = {
          dangerouslyIgnoreEtag: true, // Ignore automatic conflict prevention using etags
        };
      } else if (options && typeof options === "object") {
        overrideOptions = {
          ...options,
          dangerouslyIgnoreEtag: true, // Ignore automatic conflict prevention using etags
        };
      }

      // Get the API key
      const apiKey = await getApiKey();

      // Get the gaiaAddress from the publicKey
      const gaiaAddress = await getGaiaAddressFromPublicKey();

      if (!gaiaAddress) {
        throw new Error("User authentication data not available");
      }

      // Based on the options, encrypt the content
      let contentToSend = file;
      if (options && options.encrypt !== false) {
        contentToSend = await encryptContent(file, options);
      }

      // Make API call to BlockSurvey Storage endpoint
      const response = await fetch("/api/storage/put", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          fileName: fileName,
          content: contentToSend,
          gaiaAddress: gaiaAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get file from BlockSurvey Storage directly
 */
export function getFileFromGaia(fileName, options) {
  // Note: options parameter kept for compatibility but not used for direct storage access
  return new Promise(async (resolve, reject) => {
    try {
      // Get the gaiaAddress from the publicKey
      const gaiaAddress = await getGaiaAddressFromPublicKey();

      // Construct BlockSurvey Storage URL: https://storage.ballot.gg/{gaiaAddress}/{fileName}
      let storageUrl = `https://storage.ballot.gg/${gaiaAddress}/${fileName}`;

      // Add timestamp to ensure we get the latest file from cache
      if (fileName) {
        storageUrl += `?timestamp=${Date.now()}`;
      }

      // Fetch directly from BlockSurvey Storage
      const response = await fetch(storageUrl, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // File not found, resolve with null (matching Gaia behavior)
          return reject({
            code: "does_not_exist",
            message: "File not found"
          });
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the content as text first
      const content = await response.text();

      if (content) {
        // Parse content to check if it's JSON
        let parsedContent;
        try {
          parsedContent = JSON.parse(content);
        } catch (e) {
          // Not JSON, treat as plain text
          parsedContent = content;
        }

        // Check the option for decrypt
        if (options && options.decrypt === false) {
          // if the response is a object, stringify it
          if (parsedContent && typeof parsedContent === "object") {
            resolve(JSON.stringify(parsedContent));
            return;
          } else {
            resolve(parsedContent);
            return;
          }
        } else {
          if (parsedContent && typeof parsedContent === "object") {
            try {
              resolve(await decryptContent(JSON.stringify(parsedContent)));
              return;
            } catch (error) {
              console.error(error);
              resolve(JSON.stringify(parsedContent));
              return;
            }
          } else {
            resolve(parsedContent);
            return;
          }
        }
      } else {
        resolve(null);
      }
    } catch (error) {
      // On any error, resolve with null (matching Gaia behavior)
      resolve(null);
    }
  });
}

export function deleteFileToGaia(fileName) {
  // BlockSurvey Storage doesn't support delete operations directly
  // Return a resolved promise to maintain compatibility
  return Promise.resolve();
}

/**
 * Network as a plain string ("mainnet" | "testnet").
 * Required by @stacks/connect v8 `request()` wallet calls, which take a
 * network name string instead of a StacksNetwork object.
 * (The old getNetworkType() returning StacksMainnet/StacksTestnet class
 * instances was removed — @stacks/network v7 dropped those classes and no
 * code called it anymore.)
 */
export function getNetworkString() {
  return stacksMainnetFlag ? "mainnet" : "testnet";
}

export function getMyStxAddress() {
  if (stacksMainnetFlag) {
    return getUserData().profile.stxAddress.mainnet;
  } else {
    return getUserData().profile.stxAddress.testnet;
  }
}

export function getStacksAPIPrefix() {
  if (stacksMainnetFlag) {
    return Constants.STACKS_MAINNET_API_URL;
  } else {
    return Constants.STACKS_TESTNET_API_URL;
  }
}

/**
 * Get headers for Stacks API calls with API key
 */
export function getStacksAPIHeaders(additionalHeaders = {}) {
  return {
    "x-api-key": Constants.STACKS_API_KEY,
    "Accept": "application/json",
    ...additionalHeaders
  };
}

/**
 * Encrypt content using user's public key
 */
async function encryptContent(content, options) {
  try {
    if (!content) {
      throw new Error("Content is empty");
    }

    // Get the public key
    const userData = getUserData();
    const publicKey = options?.publicKey
      ? options.publicKey
      : getPublicKeyFromPrivate(userData?.appPrivateKey);

    if (!publicKey) {
      throw new Error("Public key not available");
    }

    // Encrypt using public key
    const cipherObject = await encryptECIES(
      publicKey,
      utf8ToBytes(content),
      true
    );
    return JSON.stringify(cipherObject);
  } catch (error) {
    throw error;
  }
}

/**
 * Decrypt content using user's private key
 */
async function decryptContent(content) {
  try {
    if (!content) {
      throw new Error("Content is empty");
    }

    // Get the private key from user data
    const userData = getUserData();
    const privateKey = userData?.appPrivateKey;

    if (!privateKey) {
      throw new Error("Private key not available");
    }

    // Decrypt using private key
    const cipherObject = JSON.parse(content);
    const decryptedContent = await decryptECIES(privateKey, cipherObject);
    return decryptedContent;
  } catch (error) {
    throw error;
  }
}

export async function getGaiaAddressFromPublicKey() {

  // Get the private key from user data
  const userData = userSession.loadUserData();

  // Check, if the private key is available
  if (!userData || !userData?.appPrivateKey) {
    throw new Error("Private key not available");
  }

  // Get the public key
  const publicKey = await getPublicKeyFromPrivate(userData?.appPrivateKey);

  // Derive the gaia address from the app private key
  const gaiaAddress = await publicKeyToBtcAddress(publicKey);

  return gaiaAddress;
}

let apiKey = null;
export async function getApiKey() {
  // Get the private key from user data
  const userData = getUserData();

  // Validation
  if (!userData?.appPrivateKey) {
    throw new Error("User not signed in");
  }

  // If the api key is already in memory, return it
  if (apiKey) {
    return apiKey;
  }

  // Get the public key
  const publicKey = await getPublicKeyFromPrivate(userData?.appPrivateKey);

  // Ask for encrypted nonce from server
  const nonceResponse = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicKey }),
  });
  const nonceData = await nonceResponse.json();
  const encryptedNonce = nonceData.data.encryptedNonce;

  // Decrypt the nonce using the private key
  const decryptedNonce = await decryptContent(JSON.stringify(encryptedNonce));

  // Send the decrypted nonce to the server
  const verifyResponse = await fetch("/api/auth/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey,
      decryptedNonce: JSON.parse(decryptedNonce),
    }),
  });

  if (!verifyResponse.ok) {
    const errorText = await verifyResponse.text();
    throw new Error(`Verify failed: ${verifyResponse.status} - ${errorText}`);
  }

  // Store the API key in memory
  const verifyData = await verifyResponse.json();
  apiKey = verifyData.data.apiKey;

  return apiKey;
}