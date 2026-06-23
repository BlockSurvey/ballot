import Head from "next/head";
import { Constants } from "../../common/constants";
import GroupTaking from "../../components/group/GroupTaking";
import { fetchGroup } from "../../services/group-storage";
import {
    calculateDateFromBitcoinBlockHeight, getCurrentBlockHeights, getEffectivePollEndDate
} from "../../services/utils";

export default function GroupPage({ groupObject, pollObjects, currentBitcoinBlockHeight, currentStacksBlockHeight }) {
    const title = groupObject?.title ? `${groupObject.title} | Ballot` : "Grouped Poll | Ballot";
    const description = (groupObject?.description || "Vote on a bundle of polls in one place.").substr(0, 160);
    const metaImage = "https://ballot.gg/images/ballot-meta.png";

    if (!groupObject) {
        return (
            <>
                <Head><title>Grouped Poll | Ballot</title></Head>
                <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
                    <h1 style={{ fontWeight: 700 }}>Group not found</h1>
                    <p style={{ color: "var(--color-tertiary)" }}>
                        This grouped poll link is invalid or is no longer available.
                    </p>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="robots" content="index,follow" />
                <link rel="icon" href={"/favicon.ico"} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={metaImage} />
                <meta property="og:site_name" content="ballot.gg" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={metaImage} />
            </Head>

            <GroupTaking
                groupObject={groupObject}
                pollObjects={pollObjects}
                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                currentStacksBlockHeight={currentStacksBlockHeight}
            />
        </>
    );
}

/** Apply the same block-height-is-source-of-truth normalization the poll page uses. */
function normalizePollByHeight(pollObject, currentBitcoinBlockHeight) {
    if (!pollObject || !pollObject.endAtBlock || !currentBitcoinBlockHeight) return pollObject;
    try {
        const effectiveEndDate = getEffectivePollEndDate(pollObject, currentBitcoinBlockHeight);
        if (effectiveEndDate) {
            pollObject.endAtDateUTC = effectiveEndDate.toISOString();
            pollObject.endAtDate = effectiveEndDate.toISOString();
        }
        if (pollObject.startAtBlock) {
            const effectiveStartDate = calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, pollObject.startAtBlock);
            if (effectiveStartDate) {
                pollObject.startAtDateUTC = effectiveStartDate.toISOString();
                pollObject.startAtDate = effectiveStartDate.toISOString();
            }
        }
        pollObject.isClosedByHeight = currentBitcoinBlockHeight > pollObject.endAtBlock;
    } catch (error) {
        console.error("Error normalizing poll by height:", error);
    }
    return pollObject;
}

export async function getServerSideProps(context) {
    const { params } = context;
    const { id: pathParams } = params;

    const groupId = pathParams?.[0];
    const gaiaAddress = pathParams?.[1];

    let groupObject = null;
    let pollObjects = [];

    if (groupId && gaiaAddress) {
        try {
            groupObject = await fetchGroup(groupId, gaiaAddress);
        } catch (error) {
            console.error("Error fetching group:", error);
        }
    }

    // Current block heights (source of truth for open/closed state).
    let currentBitcoinBlockHeight = 0;
    let currentStacksBlockHeight = 0;
    try {
        const currentBlock = await getCurrentBlockHeights();
        currentBitcoinBlockHeight = currentBlock?.bitcoinHeight || 0;
        currentStacksBlockHeight = currentBlock?.stacksHeight || 0;
    } catch (error) {
        console.error("Error fetching current block heights:", error);
    }

    // Fetch every referenced poll in parallel, preserving group order.
    if (groupObject?.polls?.length) {
        const ordered = [...groupObject.polls].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        pollObjects = await Promise.all(
            ordered.map(async (ref) => {
                const pollGaia = ref.gaiaAddress || groupObject.creatorGaiaAddress || gaiaAddress;
                try {
                    const url = `${Constants.GAIA_HUB_PREFIX}${pollGaia}/${ref.pollId}.json`;
                    const response = await fetch(url);
                    if (!response.ok) return null;
                    const poll = await response.json();
                    return normalizePollByHeight(poll, currentBitcoinBlockHeight);
                } catch (error) {
                    console.error("Error fetching grouped poll:", ref.pollId, error);
                    return null;
                }
            })
        );
        // Keep group ref order aligned with fetched poll objects.
        groupObject = { ...groupObject, polls: ordered };
    }

    return {
        props: {
            groupObject,
            pollObjects,
            currentBitcoinBlockHeight,
            currentStacksBlockHeight,
        },
    };
}
