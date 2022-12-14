import { Constants } from "../common/constants";
import { getMyStxAddress, getStacksAPIPrefix, getUserData, userSession } from "../services/auth";

export async function getRecentBlock() {
    // Get btc domain for logged in user
    const response = await fetch(
        getStacksAPIPrefix() + "/extended/v1/block?limit=1"
    );
    const responseObject = await response.json();

    return responseObject?.results?.[0];
}

export function formStacksExplorerUrl(txId) {
    return (
        "https://explorer.stacks.co/txid/" +
        txId +
        "?chain=" +
        (Constants.STACKS_MAINNET_FLAG ? "mainnet" : "testnet")
    );
}

export function convertToDisplayDateFormat(date) {
    return new Date(date).toLocaleDateString('general', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', hour12: true, minute: 'numeric' })
}

// Fetch and store once
var displayUsername;
export async function getDomainNamesFromBlockchain() {
    if (displayUsername) {
        return displayUsername;
    }

    // If user is not signed in, just return
    if (!userSession.isUserSignedIn()) {
        return;
    }

    // Get btc domain for logged in user
    const response = await fetch(
        getStacksAPIPrefix() + "/v1/addresses/stacks/" + getMyStxAddress()
    );
    const responseObject = await response.json();

    // Testnet code
    if (Constants.STACKS_MAINNET_FLAG == false) {
        displayUsername = getMyStxAddress().substr(-5) + ".btc";
        return displayUsername;
    }

    // Get btc dns
    if (responseObject?.names?.length > 0) {
        const btcDNS = responseObject.names.filter((bns) =>
            bns.endsWith(".btc")
        );

        // Check does BTC dns is available
        if (btcDNS && btcDNS.length > 0) {
            // BTC holder
            displayUsername = btcDNS[0];

        } else {
            // Not a BTC holder
            displayUsername = responseObject.names?.[0];
        }
    } else {
        displayUsername = getUserData().identityAddress;
    }

    return displayUsername;
};

// Social media share
/**
 * Get Twitter post content
 */
export function openTwitterUrl(url, title) {
    if (title && url) {
        let link = "https://twitter.com/intent/tweet?text=" + title + "&url=" + url;
        window.open(link, "_blank");
    }
}

/**
 * Get Facebook post content
 */
export function openFacebookUrl(url, title) {
    if (url) {
        let link = "https://www.facebook.com/sharer.php?u=" + url;
        window.open(link, "_blank");
    }
}

/**
 * Get Linkedin post content
 */
export function openLinkedinUrl(url, title) {
    if (url) {
        let link = "https://www.linkedin.com/sharing/share-offsite/?url=" + url;

        // Adding extra text
        if (title) {
            link = link + "&summary=" + title;
        }

        window.open(link, "_blank");
    }
}

/**
 * Get Whatsapp post content
 */
export function openWhatsappUrl(url, title) {
    if (url) {
        let link = "https://web.whatsapp.com/send?text=" + url;
        window.open(link, "_blank");
    }
}

/**
 * Get Telegram post content
 */
export function openTelegramUrl(url, title) {
    if (url) {
        let link = "https://telegram.me/share/url?url=" + url;
        window.open(link, "_blank");
    }
}

/**
 * Get Facebook post content
 */
export function openRedditUrl(url, title) {
    if (url) {
        let link = "https://www.reddit.com/submit?url=" + url;
        window.open(link, "_blank");
    }
}
  // Social media share