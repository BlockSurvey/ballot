import {
    cvToHex, cvToValue, parseReadOnlyResponse, standardPrincipalCV
} from "@stacks/transactions";
import {
    getMyStxAddress, getStacksAPIHeaders, getStacksAPIPrefix, userSession
} from "./auth";

/**
 * Read whether the currently connected wallet has already voted on a single poll,
 * using the deployed poll contract's read-only `get-result-by-user`.
 *
 * This is the same on-chain check the single-poll page performs; it is extracted
 * here so the grouped-poll wizard can check participation for every poll in a bundle
 * in parallel to seed the progress toolbar.
 *
 * @param {object} pollObject - a published poll object (needs publishedInfo.contractAddress/Name)
 * @returns {Promise<{ voted: boolean, votes: object } | null>} the user's vote map, or null if not voted / not signed in / on error
 */
export async function getUserVoteForPoll(pollObject) {
    if (!userSession.isUserSignedIn()) {
        return null;
    }

    const contractAddress = pollObject?.publishedInfo?.contractAddress;
    const contractName = pollObject?.publishedInfo?.contractName;
    if (!contractAddress || !contractName) {
        return null;
    }

    try {
        const url = getStacksAPIPrefix() +
            "/v2/contracts/call-read/" + contractAddress + "/" + contractName + "/get-result-by-user";

        const rawResponse = await fetch(url, {
            method: "POST",
            headers: getStacksAPIHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                sender: contractAddress,
                arguments: [cvToHex(standardPrincipalCV(getMyStxAddress()))]
            }),
        });

        if (!rawResponse.ok) {
            console.error(`Failed to fetch user vote status: ${rawResponse.status} ${rawResponse.statusText}`);
            return null;
        }

        const content = await rawResponse.json();

        if (content && content.okay) {
            const results = cvToValue(parseReadOnlyResponse(content)).value;
            if (results) {
                const votes = {};
                results?.value?.vote?.value?.forEach((optionId, index) => {
                    const voteValue = results?.value?.volume?.value?.[index]?.value;
                    if (optionId?.value && voteValue) {
                        votes[optionId.value] = voteValue;
                    }
                });
                return { voted: true, votes };
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching user vote status:", error);
        return null;
    }
}
