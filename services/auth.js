import { utf8ToBytes } from "@stacks/common";
import { AppConfig, showConnect, UserSession } from "@stacks/connect";
import {
  decryptECIES,
  encryptECIES,
  getPublicKeyFromPrivate,
  publicKeyToBtcAddress,
} from "@stacks/encryption";
import { StacksMainnet, StacksTestnet } from "@stacks/network";
import { Constants } from "../common/constants";

const appConfig = new AppConfig(["store_write", "publish_data"]);

export const userSession = new UserSession({ appConfig });

// Set this to true if you want to use Mainnet
const stacksMainnetFlag = Constants.STACKS_MAINNET_FLAG;

export function getUserData() {
  return userSession.loadUserData();
}

export function alreadyLoggedIn() {
  if (!userSession.isUserSignedIn() && userSession.isSignInPending()) {
    userSession.handlePendingSignIn().then((userData) => {
      // Redirect to dashboard
      window.location.assign("/all-polls");
    });
  } else if (userSession && userSession.isUserSignedIn()) {
    // Redirect to dashboard
    window.location.assign("/all-polls");
  }
}

/**
 * Sign in
 */
export function authenticate(redirectTo) {
  // Sign up
  if (!userSession.isUserSignedIn() && !userSession.isSignInPending()) {
    showConnect({
      appDetails: {
        name: "Ballot",
        icon: window.location.origin + "/images/logo/ballot.png",
      },
      redirectTo: "/",
      onFinish: () => {
        if (redirectTo) {
          // Redirect to dashboard
          window.location.assign(redirectTo);
        } else {
          // Redirect to dashboard
          window.location.assign("/all-polls");
        }
      },
      userSession: userSession,
    });
  } else if (userSession && userSession.isUserSignedIn()) {
    // Redirect to dashboard
    window.location.assign("/all-polls");
  }
}

export function switchAccount(redirectTo) {
  showConnect({
    appDetails: {
      name: "Ballot",
      icon: window.location.origin + "/images/logo/ballot.png",
    },
    redirectTo: "/",
    onFinish: () => {
      if (redirectTo) {
        // Redirect to dashboard
        window.location.assign(redirectTo);
      } else {
        // Redirect to dashboard
        window.location.assign("/all-polls");
      }
    },
    userSession: userSession,
  });
}

/**
 * Sign out
 */
export function signOut() {
  // Logout
  userSession.signUserOut();

  // Redirect to dashboard
  window.location.assign("/");
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
 * Get stacks network type (Mainnet/Testnet)
 */
export function getNetworkType() {
  if (stacksMainnetFlag) {
    return new StacksMainnet();
  } else {
    return new StacksTestnet();
  }
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