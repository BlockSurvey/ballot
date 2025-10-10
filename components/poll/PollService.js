import {
    cvToHex, cvToValue, parseReadOnlyResponse, uintCV
} from "@stacks/transactions";
import { Constants } from "../../common/constants";
import { getStacksAPIPrefix, getStacksAPIHeaders } from "../../services/auth";

const getIndividualResultByStartAndEndPosition = (start, end, totalUniqueVotes, contractAddress, contractName,
    resultsByPosition, setResultsByPosition, noOfResultsLoaded, setNoOfResultsLoaded) => {
    // Store, "end" as number of results loaded
    if (!noOfResultsLoaded) {
        noOfResultsLoaded = (start - end);
        setNoOfResultsLoaded(noOfResultsLoaded);
    } else {
        noOfResultsLoaded = noOfResultsLoaded + (start - end);
        setNoOfResultsLoaded(noOfResultsLoaded);
    }

    for (let i = start; i > end; i--) {
        if (i >= 1) {
            getResultAtPosition(i, contractAddress, contractName, resultsByPosition, setResultsByPosition);
        }
    }
}

const getResultAtPosition = async (position, contractAddress, contractName,
    resultsByPosition, setResultsByPosition) => {
    try {
        const url = getStacksAPIPrefix() +
            "/v2/contracts/call-read/" +
            contractAddress +
            "/" +
            contractName +
            "/get-result-at-position";

        // Fetch voting result from stacks blockchain
        const rawResponse = await fetch(url, {
            method: "POST",
            headers: getStacksAPIHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                sender: contractAddress,
                arguments: [cvToHex(uintCV(position))]
            }),
        });

        // Check if response is ok
        if (!rawResponse.ok) {
            console.error(`Failed to fetch result at position ${position}: ${rawResponse.status} ${rawResponse.statusText}`);
            return;
        }

        const content = await rawResponse.json();

        // If data found on stacks blockchain
        if (content && content.okay) {
            const results = cvToValue(parseReadOnlyResponse(content))?.value?.value;

            // Validate results data
            if (!results) {
                console.warn(`No results data found at position ${position}`);
                return;
            }

            let resultsObj = {};
            results?.vote?.value?.forEach((option, index) => {
                resultsObj[option?.value] = results?.volume?.value?.[index]?.value;
            });

            resultsByPosition[position] = {
                "dns": results?.bns?.value,
                "address": results?.user?.value,
                "vote": resultsObj,
                "votingPower": results?.["voting-power"]?.value
            };

            // Fetch BNS (Bitcoin Name System) information
            if (Constants.STACKS_MAINNET_FLAG === true && results?.user?.value) {
                try {
                    // Get btc domain for the user
                    const response = await fetch(
                        getStacksAPIPrefix() + "/v1/addresses/stacks/" + results?.user?.value,
                        { headers: getStacksAPIHeaders() }
                    );

                    if (!response.ok) {
                        console.warn(`Failed to fetch BNS for address ${results?.user?.value}: ${response.status}`);
                    } else {
                        const responseObject = await response.json();

                        // Get btc dns
                        if (responseObject?.names?.length > 0) {
                            const btcDNS = responseObject.names.filter((bns) =>
                                bns.endsWith(".btc")
                            );

                            // Check if BTC dns is available
                            if (btcDNS && btcDNS.length > 0) {
                                resultsByPosition[position]["username"] = btcDNS[0];
                            }
                        }
                    }
                } catch (bnsError) {
                    console.warn(`Error fetching BNS information: ${bnsError.message}`);
                    // Continue without BNS - not critical
                }
            } else if (Constants.STACKS_MAINNET_FLAG === false && results?.user?.value) {
                // Testnet - use mock BNS
                const btcNamespace = results.user.value.substr(-5) + ".btc";
                resultsByPosition[position]["username"] = btcNamespace;
            }

            setResultsByPosition({ ...resultsByPosition });
        }
    } catch (error) {
        console.error(`Error fetching result at position ${position}:`, error);
        // Don't throw - allow other positions to continue loading
    }
}

export {
    getIndividualResultByStartAndEndPosition
};
