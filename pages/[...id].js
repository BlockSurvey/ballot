import {
    cvToHex, cvToValue, hexToCV, parseReadOnlyResponse, standardPrincipalCV
} from "@stacks/transactions";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Constants } from "../common/constants";
import { DashboardNavBarComponent } from "../components/common/DashboardNavBarComponent";
import PollComponent from "../components/poll/PollComponent";
import { getIndividualResultByStartAndEndPosition } from "../components/poll/PollService";
import { getMyStxAddress, getStacksAPIPrefix, userSession } from "../services/auth";
import { getRecentBlock } from "../services/utils";

export default function Poll(props) {
    // Variables
    const { pollObject, pollId, gaiaAddress, currentBlockHeight } = props;

    // Contract transaction status
    const [txStatus, setTxStatus] = useState();

    const [publicUrl, setPublicUrl] = useState();
    const [optionsMap, setOptionsMap] = useState({});
    const [resultsByOption, setResultsByOption] = useState({});
    const [resultsByPosition, setResultsByPosition] = useState({});
    const [totalVotes, setTotalVotes] = useState();
    const [totalUniqueVotes, setTotalUniqueVotes] = useState();
    const [noOfResultsLoaded, setNoOfResultsLoaded] = useState();

    // BTC dns name
    const [dns, setDns] = useState();

    // TokenIds
    const [alreadyVoted, setAlreadyVoted] = useState(false);
    const [noHoldingToken, setNoHoldingToken] = useState(false);
    const [holdingTokenIdsArray, setHoldingTokenIdsArray] = useState();

    // Voting power
    const [votingPower, setVotingPower] = useState();

    const title = `${pollObject?.title} | Ballot`;
    const description = pollObject?.description?.substr(0, 160);
    const metaImage = "https://ballot.gg/images/ballot-meta.png";
    const displayURL = "";

    // Functions
    useEffect(() => {
        // Set shareable public URL
        setPublicUrl(`https://ballot.gg/${pollId}/${gaiaAddress}`);

        if (pollObject) {
            // Parse poll options
            pollObject?.options.forEach(option => {
                optionsMap[option.id] = option.value;
            });
            setOptionsMap(optionsMap);

            // Get contract transaction status
            getContractTransactionStatus(pollObject);

            // Fetch token holdings
            fetchTokenHoldings(pollObject);

            // Fetch results
            getPollResults(pollObject);

            // Fetch result by user
            getResultByUser(pollObject);
        }
    }, [pollObject, pollId, gaiaAddress]);

    const getContractTransactionStatus = async (pollObject) => {
        if (!pollObject?.publishedInfo?.txId) {
            return;
        }

        // Get btc domain for logged in user
        const response = await fetch(
            getStacksAPIPrefix() + "/extended/v1/tx/" + pollObject?.publishedInfo?.txId
        );
        const responseObject = await response.json();
        setTxStatus(responseObject?.tx_status);
    }

    const fetchTokenHoldings = (pollObject) => {
        // If user is not signed in, just return
        if (!userSession.isUserSignedIn()) {
            return;
        }

        // Strategy
        if (pollObject?.votingStrategyFlag) {
            if (pollObject?.strategyTokenType == "nft") {
                // Fetch NFT holdings
                getNFTHolding(pollObject);
            } else if (pollObject?.strategyTokenType == "ft") {
                // Fetch FT holdings
                getFTHolding(pollObject);
            }
        } else {
            // No strategy

            // Allow anybody to vote
            setHoldingTokenIdsArray([]);
            setVotingPower(1);
        }
    }

    const getNFTHolding = async (pollObject) => {
        if (pollObject?.votingStrategyTemplate) {
            // BTC holders check
            if (pollObject?.votingStrategyTemplate === "btcholders") {
                // Fetch BTC domain
                getBTCDomainFromBlockchain(pollObject);
            } else if (pollObject?.strategyContractName && pollObject?.strategyTokenName) {
                const limit = 200;
                // Get NFT holdings
                const responseObject = await makeFetchCall(getStacksAPIPrefix() + "/extended/v1/tokens/nft/holdings?principal=" + getMyStxAddress() +
                    "&asset_identifiers=" + pollObject?.strategyContractName + "::" + pollObject?.strategyTokenName + "&offset=0&limit=" + limit);
                if (responseObject?.total > 0) {
                    // Set voting power
                    setVotingPower(responseObject?.total);

                    const _holdingTokenIdsArray = [];
                    responseObject?.results.forEach(eachNFT => {
                        _holdingTokenIdsArray.push(cvToValue(hexToCV(eachNFT.value.hex)));
                    });

                    // If there are more than 200, then fetch all
                    if (responseObject?.total > limit) {
                        const remainingTotal = (responseObject?.total - limit);
                        const noOfFetchCallsToBeMade = Math.ceil(remainingTotal / limit);

                        let listOfPromises = [];
                        for (let i = 1; i <= noOfFetchCallsToBeMade; i++) {
                            const offset = i * limit;

                            listOfPromises.push(makeFetchCall(getStacksAPIPrefix() + "/extended/v1/tokens/nft/holdings?principal=" + getMyStxAddress() +
                                "&asset_identifiers=" + pollObject?.strategyContractName + "::" + pollObject?.strategyTokenName + "&offset=" + offset + "&limit=" + limit));
                        }

                        await Promise.all(listOfPromises).then(results => {
                            results?.forEach(responseObject => {
                                responseObject?.results.forEach(eachNFT => {
                                    _holdingTokenIdsArray.push(cvToValue(hexToCV(eachNFT.value.hex)));
                                });
                            });
                        });
                    }

                    holdingTokenIdsArray = _holdingTokenIdsArray;
                    setHoldingTokenIdsArray(holdingTokenIdsArray);
                } else {
                    // No holdings to vote
                    setNoHoldingToken(true);
                }
            }
        }
    }

    const makeFetchCall = (url) => {
        return new Promise(async (resolve, reject) => {
            const response = await fetch(url);
            const responseObject = await response.json();
            resolve(responseObject);
        })
    }

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
                if (pollObject?.votingStrategyFlag && pollObject?.votingStrategyTemplate === "btcholders") {
                    setHoldingTokenIdsArray([]);
                    setVotingPower(1);
                }
            } else {
                // Not a BTC holder

                // Turn flag on
                if (pollObject?.votingStrategyFlag && pollObject?.votingStrategyTemplate === "btcholders") {
                    // No holdings to vote
                    setNoHoldingToken(true);
                }
            }
        } else {
            // Not a BTC holder

            // Turn flag on
            if (pollObject?.votingStrategyFlag && pollObject?.votingStrategyTemplate === "btcholders") {
                // No holdings to vote
                setNoHoldingToken(true);
            }
        }
    }

    const getFTHolding = async (pollObject) => {
        if (pollObject?.votingStrategyTemplate) {
            // BTC holders check
            if (pollObject?.votingStrategyTemplate === "stx") {
                // Fetch STX holdings
                getSTXHolding();
            } else if (pollObject?.strategyContractName && pollObject?.strategyTokenName) {
                const response = await fetch(`${getStacksAPIPrefix()}/extended/v1/address/${getMyStxAddress()}/balances` +
                    (pollObject?.snapshotBlockHeight ? "?until_block=" + pollObject?.snapshotBlockHeight : ""));
                const responseObject = await response.json();

                if (responseObject?.fungible_tokens && responseObject?.fungible_tokens?.[pollObject?.strategyContractName + "::" + pollObject?.strategyTokenName]) {
                    const tokenInfo = responseObject?.fungible_tokens?.[pollObject?.strategyContractName + "::" + pollObject?.strategyTokenName];

                    if (tokenInfo?.balance !== "0") {
                        // Default value
                        let tokenDecimalsPowerOfTen = 1000000;
                        if (pollObject?.strategyTokenDecimals && parseInt(pollObject?.strategyTokenDecimals) >= 0) {
                            tokenDecimalsPowerOfTen = Math.pow(10, parseInt(pollObject?.strategyTokenDecimals));
                        } else if (pollObject?.strategyTokenDecimals && parseInt(pollObject?.strategyTokenDecimals) === 0) {
                            tokenDecimalsPowerOfTen = 1;
                        }

                        const tokenBalance = Math.floor((parseInt(tokenInfo?.balance) / tokenDecimalsPowerOfTen));
                        setHoldingTokenIdsArray([]);
                        setVotingPower(tokenBalance);
                    } else {
                        // No holdings to vote
                        setNoHoldingToken(true);
                    }
                } else {
                    // No holdings to vote
                    setNoHoldingToken(true);
                }
            }
        }
    }

    const getSTXHolding = async () => {
        const response = await fetch(`${getStacksAPIPrefix()}/extended/v1/address/${getMyStxAddress()}/stx` +
            (pollObject?.snapshotBlockHeight ? "?until_block=" + pollObject?.snapshotBlockHeight : ""));
        const responseObject = await response.json();

        if (responseObject?.balance !== "0") {
            const stxBalance = Math.floor((parseInt(responseObject?.balance) / 1000000));
            setHoldingTokenIdsArray([]);
            setVotingPower(stxBalance);
        } else {
            // No holdings to vote
            setNoHoldingToken(true);
        }
    }

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

                const total = parseInt(results?.["total-votes"]?.value ? (results?.["total-votes"]?.value) : (results?.total?.value));
                setTotalVotes(total);

                // Total unique vote
                totalUniqueVotes = results?.total?.value;
                setTotalUniqueVotes(results?.total?.value);

                let resultsObj = {};
                results?.options?.value.forEach((option, index) => {
                    resultsObj[option?.value] = {
                        total: results?.results?.value?.[index]?.value,
                        percentage: results?.results?.value?.[index]?.value == 0 ? 0 : ((results?.results?.value?.[index]?.value / total) * 100).toFixed(2)
                    };
                });
                setResultsByOption(resultsObj);

                // Get list of individual vote
                getIndividualResultByStartAndEndPosition(results?.total?.value, (results?.total?.value > 10 ? (results?.total?.value - 10) : 0), totalUniqueVotes,
                    contractAddress, contractName, resultsByPosition, setResultsByPosition, noOfResultsLoaded, setNoOfResultsLoaded);
            } else {
                setTotalVotes(0);
                setTotalUniqueVotes(0);
                setNoOfResultsLoaded(0);
            }
        }
    };

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
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                <meta name="robots" content="index,follow" />

                {/* Favicon */}
                <link rel="icon" href={"/favicon.ico"} />

                {/* Facebook Meta Tags */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={displayURL} />
                <meta property="og:image" content={metaImage} />
                <meta property="og:site_name" content="ballot.gg" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />

                {/* Twitter Meta Tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:url" content={displayURL} />
                <meta name="twitter:image" content={metaImage} />
                {/* <meta name="twitter:site" content="@ballot_gg" /> */}
            </Head>

            {/* Outer layer */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Nav bar */}
                        <DashboardNavBarComponent />

                        {/* Body */}
                        <PollComponent pollObject={pollObject} optionsMap={optionsMap} resultsByOption={resultsByOption}
                            resultsByPosition={resultsByPosition} setResultsByPosition={setResultsByPosition}
                            totalVotes={totalVotes} totalUniqueVotes={totalUniqueVotes}
                            dns={dns} alreadyVoted={alreadyVoted} noHoldingToken={noHoldingToken}
                            holdingTokenIdsArray={holdingTokenIdsArray}
                            votingPower={votingPower} publicUrl={publicUrl} txStatus={txStatus}
                            noOfResultsLoaded={noOfResultsLoaded} setNoOfResultsLoaded={setNoOfResultsLoaded}
                            currentBlockHeight={currentBlockHeight} />
                    </Col>
                </Row>
            </Container>
        </>
    );
}

// This gets called on every request
export async function getServerSideProps(context) {
    // Get path param
    const { params } = context;
    const { id: pathParams } = params;
    let pollObject;
    let pollId, gaiaAddress;

    if (pathParams && pathParams?.[0]) {
        pollId = pathParams[0];
    }
    if (pathParams && pathParams?.[1]) {
        gaiaAddress = pathParams[1];
    }

    // Fetch from Gaia
    if (pollId && gaiaAddress) {
        // Form gaia url            
        const pollGaiaUrl = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/" + pollId + ".json";

        const response = await fetch(pollGaiaUrl);
        pollObject = await response.json();
    }

    // Get current block height
    const currentBlock = await getRecentBlock();
    const currentBlockHeight = currentBlock?.tenure_height || 0;

    // Pass data to the page via props
    return {
        props: {
            pollObject,
            pollId,
            gaiaAddress,
            currentBlockHeight
        },
    };
}