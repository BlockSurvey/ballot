import {
    cvToHex, cvToValue, parseReadOnlyResponse, uintCV
} from "@stacks/transactions";
import { Constants } from "../../common/constants";
import { getStacksAPIPrefix } from "../../services/auth";

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
    let url = getStacksAPIPrefix() +
        "/v2/contracts/call-read/" +
        contractAddress +
        "/" +
        contractName +
        "/get-result-at-position";

    // Fetch gaia URL from stacks blockchain
    const rawResponse = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sender: contractAddress,
            arguments: [cvToHex(uintCV(position))]
        }),
    });
    const content = await rawResponse.json();

    // If data found on stacks blockchain
    if (content && content.okay) {
        const results = cvToValue(parseReadOnlyResponse(content))?.value?.value;

        let resultsObj = {};
        results?.vote?.value.forEach((option, index) => {
            resultsObj[option?.value] = results?.volume?.value?.[index]?.value;
        });

        resultsByPosition[position] = {
            "dns": results?.bns?.value,
            "address": results?.user?.value,
            "vote": resultsObj,
            "votingPower": results?.["voting-power"]?.value
        }

        // Testnet code
        if (Constants.STACKS_MAINNET_FLAG == true && results?.user?.value) {
            // Get btc domain for logged in user
            const response = await fetch(
                getStacksAPIPrefix() + "/v1/addresses/stacks/" + results?.user?.value
            );
            const responseObject = await response.json();

            // Get btc dns
            if (responseObject?.names?.length > 0) {
                const btcDNS = responseObject.names.filter((bns) =>
                    bns.endsWith(".btc")
                );

                // Check does BTC dns is available
                if (btcDNS && btcDNS.length > 0) {
                    // BTC holder
                    const btcNamespace = btcDNS[0];
                    resultsByPosition[position]["username"] = btcNamespace;
                }
            }
        } else if (Constants.STACKS_MAINNET_FLAG == false) {
            // Testnet
            const btcNamespace = results?.user?.value?.substr(-5) + ".btc";
            resultsByPosition[position]["username"] = btcNamespace;
        }

        setResultsByPosition({ ...resultsByPosition });
    }
}

export {
    getIndividualResultByStartAndEndPosition
};
