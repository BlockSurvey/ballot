import { Constants } from "../common/constants";
import { getMyStxAddress, getStacksAPIPrefix, getStacksAPIHeaders, getUserData, userSession } from "../services/auth";

/**
 * Formats a number with comma separators for better readability
 * @param {number|string} number - The number to format (can be string or number)
 * @returns {string} Formatted number with commas (e.g., "1,234,567")
 */
export function formatNumber(number) {
    if (number === null || number === undefined || number === '') return "0";

    // Handle both string and number types
    const numValue = typeof number === 'string' ? parseFloat(number) : number;

    // Check if the result is a valid number
    if (isNaN(numValue)) return "0";

    return numValue.toLocaleString('en-US');
}

export async function getRecentBlock() {
    try {
        const response = await fetch(
            getStacksAPIPrefix() + "/extended/v1/block?limit=1",
            { headers: getStacksAPIHeaders() }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseObject = await response.json();
        return responseObject?.results?.[0];
    } catch (error) {
        console.error("Error fetching recent block:", error);
        return null;
    }
}

export async function getCurrentBlockHeights() {
    try {
        const resp = await fetch(getStacksAPIPrefix() + "/extended", {
            headers: getStacksAPIHeaders()
        });
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        const js = await resp.json();
        const stacksHeight = js.chain_tip.block_height;
        const bitcoinHeight = js.chain_tip.burn_block_height;
        return { stacksHeight, bitcoinHeight };
    } catch (error) {
        console.error("Error fetching block heights:", error);
        return null;
    }
}

export function formStacksExplorerUrl(txId, type = 'txid') {
    return (
        "https://explorer.hiro.so/" +
        type +
        "/" +
        txId +
        "?chain=" +
        (Constants.STACKS_MAINNET_FLAG ? "mainnet" : "testnet")
    );
}

export function convertToDisplayDateFormat(date) {
    return new Date(date).toLocaleDateString('general', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', hour12: true, minute: 'numeric' })
}

function shortenStxAddress(address) {
    if (!address || address.length <= 8) return address;
    return address.substring(0, 4) + "..." + address.substring(address.length - 4);
}

// Truncate the middle of a long string (address, contract id, etc.), keeping a
// few leading and trailing characters with an ellipsis in between.
// e.g. truncateMiddle("ST2FYE64JK...TQT9", 6, 4) => "ST2FYE…ТQT9"
export const truncateMiddle = (value, front = 6, back = 4) => {
    if (!value) return "";
    const str = String(value);
    if (str.length <= front + back + 1) return str;
    return `${str.slice(0, front)}…${str.slice(-back)}`;
};

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

    try {
        // Testnet code - return early for testnet
        if (Constants.STACKS_MAINNET_FLAG == false) {
            displayUsername = getMyStxAddress().substr(-5) + ".btc";
            return displayUsername;
        }

        // Get btc domain for logged in user
        const response = await fetch(
            getStacksAPIPrefix() + "/v1/addresses/stacks/" + getMyStxAddress(),
            { headers: getStacksAPIHeaders() }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseObject = await response.json();

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
            // Fallback to shortened STX address (e.g. SP2F...TQT9)
            const stxAddr = getMyStxAddress();
            displayUsername = shortenStxAddress(stxAddr);
        }
    } catch (error) {
        console.error("Error fetching domain names from blockchain:", error);
        // Fallback to shortened STX address on error
        try {
            const stxAddr = getMyStxAddress();
            displayUsername = shortenStxAddress(stxAddr);
        } catch (fallbackError) {
            console.error("Error getting fallback identity:", fallbackError);
            displayUsername = getMyStxAddress();
        }
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

export function parseJWTtoken(token) {
    // Validation
    if (!token) {
        return;
    }

    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

export function isValidUtf8(str) {
    try {
        // Encode the string as URI component and then decode it.
        decodeURIComponent(encodeURIComponent(str));
        return true;
    } catch (e) {
        // If there's a decoding error, the string is not valid UTF-8
        return false;
    }
}

export function isValidAscii(str) {
    return /^[\x20-\x7E]*$/.test(str);
}

export function formatUtcDateTime(dateTimeStr) {
    // Parse the date-time string as a UTC date
    const date = new Date(dateTimeStr);

    // Extract and format the components of the date
    const day = date.getUTCDate();
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    // Format the time in 12-hour format with AM/PM
    const hourFormatted = hours % 12 || 12; // Convert 0 (midnight) to 12
    const minuteFormatted = minutes < 10 ? '0' + minutes : minutes;
    const amPm = hours < 12 ? 'am' : 'pm';

    // Construct the formatted string
    return `${day} ${month} ${year}, ${hourFormatted}:${minuteFormatted} ${amPm}`;
}

export function formatLocalDateTime(dateTimeStr) {
    // Parse the date-time string and convert to local time
    const date = new Date(dateTimeStr);

    // Extract and format the components in local timezone
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Format the time in 12-hour format with AM/PM
    const hourFormatted = hours % 12 || 12; // Convert 0 (midnight) to 12
    const minuteFormatted = minutes < 10 ? '0' + minutes : minutes;
    const amPm = hours < 12 ? 'am' : 'pm';

    // Get the user's timezone abbreviation (e.g., "EST", "PST", "IST")
    const timeZone = date.toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop();

    // Construct the formatted string with timezone
    return `${day} ${month} ${year}, ${hourFormatted}:${minuteFormatted} ${amPm} ${timeZone}`;
}

export const calculateDateByBlockHeight = (currentBlockHeight, targetBlockHeight) => {
    if (targetBlockHeight && currentBlockHeight && targetBlockHeight > 0 && currentBlockHeight > 0 &&
        targetBlockHeight > currentBlockHeight) {
        const diff = targetBlockHeight - currentBlockHeight;
        const minutes = diff * 10;

        return new Date(new Date().getTime() + (minutes * 60 * 1000)).toISOString();
    }
}

export const calculateDateFromBitcoinBlockHeight = (currentBitcoinBlockHeight, targetBitcoinBlockHeight) => {
    // Validate inputs
    if (!targetBitcoinBlockHeight || !currentBitcoinBlockHeight || 
        targetBitcoinBlockHeight <= 0 || currentBitcoinBlockHeight <= 0) {
        console.warn('Invalid block heights:', { currentBitcoinBlockHeight, targetBitcoinBlockHeight });
        return new Date();
    }

    const diff = targetBitcoinBlockHeight - currentBitcoinBlockHeight;
    // Bitcoin blocks are mined approximately every 10 minutes
    const minutes = diff * 10;

    // Calculate the date based on the difference (can be positive for future or negative for past)
    const calculatedDate = new Date(new Date().getTime() + (minutes * 60 * 1000));

    return calculatedDate;
}

// Block height is the source of truth for a poll's lifecycle. The end date
// stored at creation is only tentative — the chain can run faster or slower —
// so we always derive the effective end date from the current height vs the
// end block. Returns a PAST date once the end block is reached, a FUTURE date
// otherwise. Falls back to stored dates only when height is unavailable.
export const getEffectivePollEndDate = (pollObject, currentBitcoinBlockHeight) => {
    if (pollObject?.endAtBlock && currentBitcoinBlockHeight) {
        return calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, pollObject.endAtBlock);
    }
    if (pollObject?.endAtDateUTC) return new Date(pollObject.endAtDateUTC);
    if (pollObject?.endAtDate) return new Date(pollObject.endAtDate);
    return null;
};

// A poll is closed once the current Bitcoin block height passes its end block.
export const isPollClosedByHeight = (pollObject, currentBitcoinBlockHeight) => {
    if (!currentBitcoinBlockHeight || !pollObject?.endAtBlock) return false;
    return currentBitcoinBlockHeight > pollObject.endAtBlock;
};

// Shared lifecycle status for a poll, returning one of:
// "draft" | "closed" | "not_started" | "active".
// Block height is the source of truth; we fall back to the stored (tentative)
// dates only for legacy index entries that predate block heights being stored.
export const getPollLifecycleStatus = (poll, currentBitcoinBlockHeight) => {
    if (poll?.status === "draft") return "draft";
    if (poll?.status === "closed" || poll?.archived === true) return "closed";

    // Height-based (authoritative) when both the end block and current height are known
    if (currentBitcoinBlockHeight && poll?.endAtBlock) {
        if (currentBitcoinBlockHeight > poll.endAtBlock) return "closed";
        if (poll?.startAtBlock && currentBitcoinBlockHeight < poll.startAtBlock) return "not_started";
        return "active";
    }

    // Fallback for legacy entries without block heights: tentative dates
    const now = new Date();
    if (poll?.endAt && new Date(poll.endAt) < now) return "closed";
    if (poll?.startAt && new Date(poll.startAt) > now) return "not_started";
    return "active";
};
