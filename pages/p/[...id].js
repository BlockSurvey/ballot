import Head from "next/head";
import { Constants } from "../../common/constants";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";
import PollComponent from "../../components/poll/PollComponent";
import {
    getCurrentBlockHeights,
    getEffectivePollEndDate,
    calculateDateFromBitcoinBlockHeight,
} from "../../services/utils";

export default function PollPreview({
    pollObject,
    currentBitcoinBlockHeight,
    currentStacksBlockHeight,
}) {
    if (!pollObject || !pollObject.id) {
        return (
            <>
                <Head>
                    <title>Preview not available | Ballot</title>
                    <meta name="robots" content="noindex,nofollow" />
                </Head>
                <DashboardNavBarComponent />
                <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: "#000" }}>Preview not available</h1>
                    <p style={{ color: "#666", marginTop: 8, lineHeight: 1.5 }}>
                        This draft could not be loaded. It may not be saved yet, the link may be
                        incorrect, or the draft is private (older encrypted drafts can&rsquo;t be shared —
                        re-save it from the builder to generate a shareable preview).
                    </p>
                </div>
            </>
        );
    }

    const title = `${pollObject?.title || "Untitled Poll"} (Preview) | Ballot`;

    return (
        <>
            <Head>
                <title>{title}</title>
                {/* Previews are unlisted and must never be indexed */}
                <meta name="robots" content="noindex,nofollow" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <DashboardNavBarComponent />

            {/* Draft preview banner */}
            <div
                style={{
                    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                    color: "#fff",
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: "0 auto",
                        padding: "10px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>
                        <strong>Preview</strong> — this poll hasn&rsquo;t been published yet.
                    </span>
                </div>
            </div>

            {/* Read-only poll preview */}
            <PollComponent
                isPreview="true"
                pollObject={pollObject}
                resultsByPosition={{}}
                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                currentStacksBlockHeight={currentStacksBlockHeight}
            />
        </>
    );
}

export async function getServerSideProps(context) {
    const { params } = context;
    const { id: pathParams } = params;

    let pollObject = null;
    let pollId = null;
    let gaiaAddress = null;

    if (pathParams && pathParams[0]) pollId = pathParams[0];
    if (pathParams && pathParams[1]) gaiaAddress = pathParams[1];

    // Fetch the (public, unencrypted) poll JSON directly from storage
    if (pollId && gaiaAddress) {
        try {
            const pollGaiaUrl = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/" + pollId + ".json";
            const response = await fetch(pollGaiaUrl);
            if (response.ok) {
                const data = await response.json();
                // Guard: encrypted drafts come back as an envelope without poll fields
                if (data && (data.title !== undefined || data.options !== undefined || data.votingSystem !== undefined)) {
                    pollObject = data;
                }
            }
        } catch (error) {
            console.error("Error fetching poll for preview:", error);
        }
    }

    // Current block heights
    let currentBitcoinBlockHeight = 0;
    let currentStacksBlockHeight = 0;
    try {
        const currentBlock = await getCurrentBlockHeights();
        currentBitcoinBlockHeight = currentBlock?.bitcoinHeight || 0;
        currentStacksBlockHeight = currentBlock?.stacksHeight || 0;
    } catch (error) {
        console.error("Error fetching current block heights:", error);
    }

    // Block height is the source of truth: derive both dates from it (same as the live poll page)
    if (pollObject && pollObject.endAtBlock && currentBitcoinBlockHeight) {
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
            console.error("Error computing effective poll dates for preview:", error);
        }
    }

    return {
        props: {
            pollObject,
            pollId,
            gaiaAddress,
            currentBitcoinBlockHeight,
            currentStacksBlockHeight,
        },
    };
}
