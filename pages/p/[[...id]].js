import {
    cvToHex, cvToValue, hexToCV, parseReadOnlyResponse, standardPrincipalCV, uintCV
} from "@stacks/transactions";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Constants } from "../../common/constants";
import DashboardMenuComponent from "../../components/dashboard/DashboardMenuComponent";
import PollComponent from "../../components/poll/PollComponent";
import { getMyStxAddress, getStacksAPIPrefix, userSession } from "../../services/auth";
import styles from "../../styles/Poll.module.css";

export default function Poll() {
    // Variables
    const router = useRouter();
    const pathParams = router.query.id;

    const [publicUrl, setPublicUrl] = useState();

    const [pollObject, setPollObject] = useState();
    const [optionsMap, setOptionsMap] = useState({});
    const [resultsByOption, setResultsByOption] = useState({});
    const [resultsByPosition, setResultsByPosition] = useState({});
    const [total, setTotal] = useState();

    // BTC dns name
    const [dns, setDns] = useState();

    // TokenIds
    const [alreadyVoted, setAlreadyVoted] = useState(false);
    const [noHoldingToken, setNoHoldingToken] = useState(false);
    const [holdingTokenArr, setHoldingTokenArr] = useState();
    const [holdingTokenIdArr, setHoldingTokenIdArr] = useState([]);

    // Voting power
    const [votingPower, setVotingPower] = useState();

    // Result screen flag
    const [isResultScreen, setIsResultScreen] = useState(false);

    // Function
    useEffect(() => {
        let pollId, gaiaAddress;
        if (pathParams && pathParams?.[0]) {
            pollId = pathParams[0];
        }

        if (pathParams && pathParams?.[1]) {
            gaiaAddress = pathParams[1];
        }

        if (pathParams && pathParams?.[2]) {
            setIsResultScreen(true)
        }

        // Set shareable public URL
        setPublicUrl(`https://ballot.gg/p/${pollId}/${gaiaAddress}`);

        // Fetch from Gaia
        if (pollId && gaiaAddress) {
            // Form gaia url            
            let gaiaUrlFromCurrentLogin = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/" + pollId + ".json";

            fetch(gaiaUrlFromCurrentLogin)
                .then(response => response.json())
                .then(data => {
                    setPollObject(data);

                    // Parse poll options
                    data?.options.forEach(option => {
                        optionsMap[option.id] = option.value;
                    });
                    setOptionsMap(optionsMap);

                    // Fetch BTC domain
                    getBTCDomainFromBlockchain(data);

                    // Fetch NFT holdings
                    getNFTHoldingInformation(data);

                    // Fetch results
                    getPollResults(data);

                    // Fetch result by user
                    getResultByUser(data);
                });
        }
    }, [pathParams]);

    /**
      * Get BTC domain from blockchain
      */
    const getBTCDomainFromBlockchain = async (pollObject) => {
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
            const _dns = getMyStxAddress().substr(-5) + ".btc";
            setDns(_dns);
            return;
        }

        // Get btc dns
        if (responseObject?.names?.length > 0) {
            const btcDNS = responseObject.names.filter((bns) =>
                bns.endsWith(".btc")
            );

            // Check does BTC dns is available
            if (btcDNS && btcDNS.length > 0) {
                // BTC holder
                const _dns = btcDNS[0];

                // Take the btc dns name
                setDns(_dns);

                // Allow to vote
                setHoldingTokenArr([]);
                setHoldingTokenIdArr([]);
                setVotingPower(1);
            } else {
                // Not a BTC holder

                // Turn flag on
                if (pollObject?.votingStrategyFlag && pollObject?.votingStrategyTemplate === "btcholders") {
                    // No holdings to vote
                    setNoHoldingToken(true);
                }
            }
        }
    };

    /**
     * Get BTC domain from blockchain
     */
    const getNFTHoldingInformation = async (pollObject) => {
        // If user is not signed in, just return
        if (!userSession.isUserSignedIn()) {
            return;
        }

        if (pollObject?.votingStrategyFlag) {
            // BTC holders check
            if (pollObject?.votingStrategyTemplate === "btcholders") {
                // Don't do anything here
            } else if (pollObject?.strategyContractName && pollObject?.strategyNFTName) {
                // Get btc domain for logged in user
                const response = await fetch(
                    getStacksAPIPrefix() + "/extended/v1/tokens/nft/holdings?principal=" + getMyStxAddress() +
                    "&asset_identifiers=" + pollObject?.strategyContractName + "::" + pollObject?.strategyNFTName
                );
                const responseObject = await response.json();

                if (responseObject?.total > 0) {
                    setHoldingTokenArr(responseObject?.results);
                    setVotingPower(responseObject?.total);

                    responseObject?.results.forEach(eachNFT => {
                        holdingTokenIdArr.push(cvToValue(hexToCV(eachNFT.value.hex)));
                    });
                    setHoldingTokenIdArr(holdingTokenIdArr);
                } else {
                    // No holdings to vote
                    setNoHoldingToken(true);
                }
            }
        } else {
            // Allow anybody to vote
            setHoldingTokenArr([]);
            setHoldingTokenIdArr([]);
            setVotingPower(1);
        }
    };

    const getPollResults = async (pollObject) => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            let url = getStacksAPIPrefix() +
                "/v2/contracts/call-read/" +
                contractAddress +
                "/" +
                contractName +
                "/get-results";

            // Fetch gaia URL from stacks blockchain
            const rawResponse = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sender: contractAddress,
                    arguments: []
                }),
            });
            const content = await rawResponse.json();

            // If data found on stacks blockchain
            if (content && content.okay) {
                const results = cvToValue(parseReadOnlyResponse(content)).value;

                let resultsObj = {};
                results?.options?.value.forEach((option, index) => {
                    resultsObj[option?.value] = results?.results?.value?.[index]?.value;
                });
                setResultsByOption(resultsObj)

                const total = parseInt(results?.total?.value);
                setTotal(total);

                getFirstTenResults((total > 10 ? 10 : total), contractAddress, contractName);
            }
        }
    };

    const getFirstTenResults = (total, contractAddress, contractName) => {
        for (let i = 1; i <= total; i++) {
            getResultAtPosition(i, contractAddress, contractName);
        }
    }

    const getResultAtPosition = async (position, contractAddress, contractName) => {
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
                "vote": resultsObj
            }

            setResultsByPosition({ ...resultsByPosition });
        }
    }

    const getResultByUser = async (pollObject) => {
        if (userSession.isUserSignedIn() &&
            pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            let url = getStacksAPIPrefix() +
                "/v2/contracts/call-read/" +
                contractAddress +
                "/" +
                contractName +
                "/get-result-by-user";

            // Fetch gaia URL from stacks blockchain
            const rawResponse = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sender: contractAddress,
                    arguments: [cvToHex(standardPrincipalCV(getMyStxAddress()))]
                }),
            });
            const content = await rawResponse.json();

            // If data found on stacks blockchain
            if (content && content.okay) {
                const results = cvToValue(parseReadOnlyResponse(content)).value;

                if (results) {
                    setAlreadyVoted(true);
                }
            }
        }
    };

    // Return
    return (
        <>
            {/* Outer layer */}
            <Container fluid>
                <Row>
                    <Col md={12} className={styles.full_container}>
                        {/* Inner layer */}
                        <div className={styles.results}>
                            {/* Left side */}
                            {
                                isResultScreen &&
                                <div className={"d-none d-md-block " + styles.results_left}>
                                    {/* Menu */}
                                    <DashboardMenuComponent />
                                </div>
                            }

                            {/* Right side */}
                            <div className={styles.results_center}>
                                <PollComponent pollObject={pollObject} optionsMap={optionsMap} resultsByOption={resultsByOption}
                                    resultsByPosition={resultsByPosition} total={total}
                                    dns={dns} alreadyVoted={alreadyVoted} noHoldingToken={noHoldingToken}
                                    holdingTokenArr={holdingTokenArr} holdingTokenIdArr={holdingTokenIdArr}
                                    votingPower={votingPower} publicUrl={publicUrl} />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
}