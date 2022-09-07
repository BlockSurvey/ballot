import {
    cvToHex, cvToValue, hexToCV, parseReadOnlyResponse, standardPrincipalCV, uintCV
} from "@stacks/transactions";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Constants } from "../../common/constants";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";
import PollComponent from "../../components/poll/PollComponent";
import { getMyStxAddress, getStacksAPIPrefix, userSession } from "../../services/auth";

export default function Poll(props) {
    const { pollObject, pollId, gaiaAddress } = props;

    // const [pollObject, setPollObject] = useState();
    const [publicUrl, setPublicUrl] = useState();
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

    const title = `${pollObject?.title} | Ballot`;
    const description = pollObject?.description;
    const metaImage = "https://ballot.gg/images/ballot-meta.png";
    const displayURL = "";

    // Function
    useEffect(() => {
        // Set poll object
        // setPollObject(data);

        // Set shareable public URL
        setPublicUrl(`https://ballot.gg/p/${pollId}/${gaiaAddress}`);

        // Fetch from Gaia
        if (pollId && gaiaAddress) {
            // Parse poll options
            pollObject?.options.forEach(option => {
                optionsMap[option.id] = option.value;
            });
            setOptionsMap(optionsMap);

            // Fetch BTC domain
            getBTCDomainFromBlockchain(pollObject);

            // Fetch NFT holdings
            getNFTHoldingInformation(pollObject);

            // Fetch results
            getPollResults(pollObject);

            // Fetch result by user
            getResultByUser(pollObject);
        }
    }, [pollObject, pollId, gaiaAddress]);

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
        } else {
            // Not a BTC holder

            // No holdings to vote
            setNoHoldingToken(true);
        }
    };

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

                {/* Twitter Meta Tags */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:url" content={displayURL} />
                <meta name="twitter:image" content={metaImage} />
                <meta name="twitter:site" content="@ballot_gg" />
            </Head>

            {/* Outer layer */}
            <Container>
                <Row>
                    <Col md={12}>
                        {/* Nav bar */}
                        <DashboardNavBarComponent />

                        {/* Body */}
                        <PollComponent pollObject={pollObject} optionsMap={optionsMap} resultsByOption={resultsByOption}
                            resultsByPosition={resultsByPosition} total={total}
                            dns={dns} alreadyVoted={alreadyVoted} noHoldingToken={noHoldingToken}
                            holdingTokenArr={holdingTokenArr} holdingTokenIdArr={holdingTokenIdArr}
                            votingPower={votingPower} publicUrl={publicUrl} />
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
        let pollGaiaUrl = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/" + pollId + ".json";

        const response = await fetch(pollGaiaUrl)
        pollObject = await response.json();
    }

    // Pass data to the page via props
    return {
        props: {
            pollObject,
            pollId,
            gaiaAddress
        },
    };
}