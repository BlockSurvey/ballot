import { Constants } from "../common/constants";
import PollContainer from "../components/poll/PollContainer";
import { getCurrentBlockHeights, getEffectivePollEndDate, calculateDateFromBitcoinBlockHeight } from "../services/utils";

export default function Poll(props) {
    return <PollContainer {...props} />;
}

// This gets called on every request
export async function getServerSideProps(context) {
    // Get path param
    const { params } = context;
    const { id: pathParams } = params;
    let pollObject = null;
    let pollId, gaiaAddress;

    if (pathParams && pathParams?.[0]) {
        pollId = pathParams[0];
    }
    if (pathParams && pathParams?.[1]) {
        gaiaAddress = pathParams[1];
    }

    // Fetch from Gaia
    if (pollId && gaiaAddress) {
        try {
            // Form gaia url
            const pollGaiaUrl = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/" + pollId + ".json";

            console.log("Fetching poll from:", pollGaiaUrl);

            const response = await fetch(pollGaiaUrl);

            if (!response.ok) {
                console.error(`Failed to fetch poll data: ${response.status} ${response.statusText}`);
            } else {
                pollObject = await response.json();
            }
        } catch (error) {
            console.error("Error fetching poll data from Gaia:", error);
            // pollObject remains null, page will show loading/error state
        }
    }

    // Get current block height
    let currentBitcoinBlockHeight = 0;
    let currentStacksBlockHeight = 0;

    try {
        const currentBlock = await getCurrentBlockHeights();
        currentBitcoinBlockHeight = currentBlock?.bitcoinHeight || 0;
        currentStacksBlockHeight = currentBlock?.stacksHeight || 0;
    } catch (error) {
        console.error("Error fetching current block heights:", error);
        // Default values already set
    }

    // Block height is the source of truth: override the tentative end date with
    // one derived from the current height vs the end block, so the displayed end
    // date and the open/closed state stay correct even when the chain runs fast
    // or slow. Also stamp an explicit closed flag for consumers.
    if (pollObject && pollObject.endAtBlock && currentBitcoinBlockHeight) {
        try {
            const effectiveEndDate = getEffectivePollEndDate(pollObject, currentBitcoinBlockHeight);
            if (effectiveEndDate) {
                pollObject.endAtDateUTC = effectiveEndDate.toISOString();
                pollObject.endAtDate = effectiveEndDate.toISOString();
            }
            // Keep the start date on the same block-derived basis as the end date,
            // otherwise a closed poll can show a future start with a past end.
            if (pollObject.startAtBlock) {
                const effectiveStartDate = calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, pollObject.startAtBlock);
                if (effectiveStartDate) {
                    pollObject.startAtDateUTC = effectiveStartDate.toISOString();
                    pollObject.startAtDate = effectiveStartDate.toISOString();
                }
            }
            pollObject.isClosedByHeight = currentBitcoinBlockHeight > pollObject.endAtBlock;
        } catch (error) {
            console.error("Error computing effective poll end date:", error);
        }
    }

    // Pass data to the page via props
    return {
        props: {
            pollObject,
            pollId,
            gaiaAddress,
            currentBitcoinBlockHeight,
            currentStacksBlockHeight
        },
    };
}