import { AppConfig, showConnect, UserSession } from "@stacks/connect";
import { StacksMainnet, StacksTestnet } from "@stacks/network";
import { Storage } from "@stacks/storage";
import { Constants } from "../common/constants";

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

export function switchAccount() {
  showConnect({
    appDetails: {
      name: "Ballot",
      icon: window.location.origin + "/images/logo/ballot.png",
    },
    redirectTo: "/",
    onFinish: () => {
      // Redirect to dashboard
      window.location.replace("/all-polls");
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
 * Save file to gaia storage
 *
 * @param {*} fileName
 * @param {*} file
 * @param {*} options
 * @returns
 */
export function putFileToGaia(fileName, file, options = {}) {
  return storage.putFile(fileName, file, options);
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
    return "https://stacks-node-api.stacks.co";
  } else {
    return "https://stacks-node-api.testnet.stacks.co";
  }
}
