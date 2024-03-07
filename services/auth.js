import { AppConfig, showConnect, UserSession } from "@stacks/connect";
import { StacksMainnet, StacksTestnet } from "@stacks/network";
import { Storage } from "@stacks/storage";
import { Constants } from "../common/constants";
import { parseJWTtoken } from "./utils";

const appConfig = new AppConfig(["store_write", "publish_data"]);

export const userSession = new UserSession({ appConfig });
export const storage = new Storage({ userSession });

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

function validateGaiaAccessToken() {
  const userData = userSession.loadUserData();

  // Validate gaiaAccessToken expire time
  if (userData["gaiaAssociationToken"]) {
    const gaiaAssociationTokenObj = parseJWTtoken(userData["gaiaAssociationToken"]);

    // If token is expired, then logout from page
    if (gaiaAssociationTokenObj && gaiaAssociationTokenObj.exp && Date.now() >= (gaiaAssociationTokenObj.exp * 1000)) {
      // Force logout
      signOut();
      return false;
    }
  }

  return true;
}

/**
 * Save file to gaia storage
 *
 * @param {*} fileName
 * @param {*} file
 * @param {*} options
 * @returns
 */
export function putFileToGaia(fileName, file, options = {}) {
  // Always validate gaiaAccessToken before saving file
  const validationStatus = validateGaiaAccessToken();
  if (!validationStatus) {
    return;
  }

  let overrideOptions = {};
  if (!options) {
    overrideOptions = {
      dangerouslyIgnoreEtag: true // Ignore automatic conflict prevention using etags
    }
  } else if (options && typeof options === 'object') {
    overrideOptions = {
      ...options,
      dangerouslyIgnoreEtag: true // Ignore automatic conflict prevention using etags
    }
  }

  return storage.putFile(fileName, file, overrideOptions);
}

/**
 * Get file from gaia storage
 *
 * @param {*} fileName
 * @param {*} options
 * @returns
 */
export function getFileFromGaia(fileName, options) {
  return storage.getFile(fileName, options);
}

export function deleteFileToGaia(fileName) {
  return storage.deleteFile(fileName);
}

/**
 * Get stacks network type (Mainnet/Testnet)
 *
 * @returns
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
