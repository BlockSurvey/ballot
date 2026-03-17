import {
    cvToHex, cvToValue, hexToCV, parseReadOnlyResponse, standardPrincipalCV
} from "@stacks/transactions";
import Head from "next/head";
import { useEffect, useState } from "react";
import { Constants } from "../common/constants";
import { DashboardNavBarComponent } from "../components/common/DashboardNavBarComponent";
import PollComponent from "../components/poll/PollComponent";
import { getIndividualResultByStartAndEndPosition } from "../components/poll/PollService";
import { getMyStxAddress, getStacksAPIHeaders, getStacksAPIPrefix, userSession } from "../services/auth";
import { checkUserBtcVotingStatus, processBtcVotesForPoll } from "../services/btc-vote-utils";
import { processDustVotingBalancesWithCache } from "../services/stx-dust-vote-utils";
import { getCurrentBlockHeights } from "../services/utils";

export default function Poll(props) {
    // Variables
    const { pollObject, pollId, gaiaAddress, currentBitcoinBlockHeight, currentStacksBlockHeight } = props;

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
    const [userVoteData, setUserVoteData] = useState(null);
    const [noHoldingToken, setNoHoldingToken] = useState(false);
    const [holdingTokenIdsArray, setHoldingTokenIdsArray] = useState();

    // Stacks balance 
    const [stacksBalance, setStacksBalance] = useState(0);

    // Voting power
    const [votingPower, setVotingPower] = useState();

    // Dust transaction voting
    const [dustVotingResults, setDustVotingResults] = useState({});
    const [dustVotingMap, setDustVotingMap] = useState({});
    const [userDustVotingStatus, setUserDustVotingStatus] = useState(null);
    const [dustVotersList, setDustVotersList] = useState([]);

    // BTC transaction voting
    const [btcVotingResults, setBtcVotingResults] = useState({});
    const [btcVotingMap, setBtcVotingMap] = useState({});
    const [userBtcVotingStatus, setUserBtcVotingStatus] = useState(null);
    const [btcVotersList, setBtcVotersList] = useState([]);
    const [btcVotingLoading, setBtcVotingLoading] = useState(false);

    // Dust transaction voting loading
    const [dustVotingLoading, setDustVotingLoading] = useState(false);

    // Recount voting (for polls with wrong snapshot height on-chain)
    const [recountLoading, setRecountLoading] = useState(false);

    // Helper function to strip HTML tags from text
    const stripHtmlTags = (html) => {
        if (!html) return "";
        // Remove HTML tags and decode HTML entities
        return html.replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
    };

    const title = `${pollObject?.title} | Ballot`;
    const description = stripHtmlTags(pollObject?.description)?.substr(0, 160);
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

            // Check if recount is required (poll deployed with wrong snapshot height)
            if (pollObject?.recountRequired) {
                // Recount: fetch contract transactions and recalculate with correct snapshot height
                getRecountedResultsForPoll(pollObject);
            } else {
                // Normal: fetch results from on-chain contract
                getPollResults(pollObject);
            }

            // Fetch result by user
            getResultByUser(pollObject);

            // Additionally check if any options have dust transaction properties
            const hasDustOptions = pollObject?.options?.some(option =>
                option.dustAddress && option.dustAmount && option.dustAmount > 0
            );

            // Check if any options have BTC address and PoX cycle properties
            const hasBtcOptions = pollObject?.options?.some(option => {
                if (!option.dustBtcAddress || !option.poxCycles) return false;

                // Handle both string (comma-separated) and array formats
                if (typeof option.poxCycles === 'string') {
                    return option.poxCycles.trim().length > 0;
                }

                return Array.isArray(option.poxCycles) && option.poxCycles.length > 0;
            });

            // Fetch dust and BTC voting results in parallel for better performance
            const votingPromises = [];

            if (hasDustOptions) {
                votingPromises.push(getDustVotingResultsForPoll(pollObject));
            }

            if (hasBtcOptions) {
                votingPromises.push(getBtcVotingResultsForPoll(pollObject));
            }

            // Execute both in parallel
            if (votingPromises.length > 0) {
                Promise.all(votingPromises).catch(error => {
                    console.error("Error fetching dust/BTC voting results:", error);
                });
            }
        }
    }, [pollObject, pollId, gaiaAddress]);

    const getContractTransactionStatus = async (pollObject) => {
        if (!pollObject?.publishedInfo?.txId) {
            return;
        }

        try {
            const response = await fetch(
                getStacksAPIPrefix() + "/extended/v1/tx/" + pollObject?.publishedInfo?.txId,
                { headers: getStacksAPIHeaders() }
            );

            if (!response.ok) {
                console.error(`Failed to fetch transaction status: ${response.status} ${response.statusText}`);
                return;
            }

            const responseObject = await response.json();
            setTxStatus(responseObject?.tx_status);
        } catch (error) {
            console.error("Error fetching contract transaction status:", error);
        }
    }

    const fetchTokenHoldings = (pollObject) => {
        // If user is not signed in, just return
        if (!userSession.isUserSignedIn()) {
            return;
        }

        if (pollObject?.votingStrategyFlag) {
            // Strategy
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
                const limit = 50;
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

                    // If there are more than 250, then fetch all
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
            try {
                const response = await fetch(url, {
                    headers: getStacksAPIHeaders()
                });

                if (!response.ok) {
                    reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                    return;
                }

                const responseObject = await response.json();
                resolve(responseObject);
            } catch (error) {
                console.error(`Error fetching ${url}:`, error);
                reject(error);
            }
        });
    }

    const getBTCDomainFromBlockchain = async (pollObject) => {
        // If user is not signed in, just return
        if (!userSession.isUserSignedIn()) {
            return;
        }

        try {
            // Get btc domain for logged in user
            const response = await fetch(
                getStacksAPIPrefix() + "/v1/addresses/stacks/" + getMyStxAddress(),
                { headers: getStacksAPIHeaders() }
            );

            if (!response.ok) {
                console.error(`Failed to fetch BTC domain: ${response.status} ${response.statusText}`);
                // On testnet or error, use mock data
                if (Constants.STACKS_MAINNET_FLAG === false) {
                    const _dns = getMyStxAddress().substr(-5) + ".btc";
                    setDns(_dns);
                }
                return;
            }

            const responseObject = await response.json();

            // Testnet code
            if (Constants.STACKS_MAINNET_FLAG === false) {
                const _dns = getMyStxAddress().substr(-5) + ".btc";
                setDns(_dns);
                return;
            }

            // Get btc dns
            if (responseObject?.names?.length > 0) {
                const btcDNS = responseObject.names.filter((bns) =>
                    bns.endsWith(".btc")
                );

                // Check if BTC dns is available
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
                        setNoHoldingToken(true);
                    }
                }
            } else {
                // Not a BTC holder
                // Turn flag on
                if (pollObject?.votingStrategyFlag && pollObject?.votingStrategyTemplate === "btcholders") {
                    setNoHoldingToken(true);
                }
            }
        } catch (error) {
            console.error("Error fetching BTC domain from blockchain:", error);
            // On error with testnet, still set mock data
            if (Constants.STACKS_MAINNET_FLAG === false) {
                const _dns = getMyStxAddress().substr(-5) + ".btc";
                setDns(_dns);
            }
        }
    }

    const getFTHolding = async (pollObject) => {
        if (pollObject?.votingStrategyTemplate) {
            try {
                if (pollObject?.votingStrategyTemplate === "stx") {
                    // Fetch STX holdings
                    await getSTXHolding();
                } else if (pollObject?.strategyContractName && pollObject?.strategyTokenName) {
                    const response = await fetch(`${getStacksAPIPrefix()}/extended/v1/address/${getMyStxAddress()}/balances` +
                        (pollObject?.snapshotBlockHeight ? "?until_block=" + pollObject?.snapshotBlockHeight : ""),
                        { headers: getStacksAPIHeaders() });

                    if (!response.ok) {
                        console.error(`Failed to fetch FT holdings: ${response.status} ${response.statusText}`);
                        setNoHoldingToken(true);
                        return;
                    }

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
                            setNoHoldingToken(true);
                        }
                    } else {
                        setNoHoldingToken(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching FT holdings:", error);
                setNoHoldingToken(true);
            }
        }
    }

    const getSTXHolding = async () => {
        try {
            const isMainnet = Constants.STACKS_MAINNET_FLAG;
            const baseUrl = isMainnet
                ? Constants.STACKS_QUICKNODE_API_URL
                : getStacksAPIPrefix();
            const headers = isMainnet ? { "Accept": "application/json" } : getStacksAPIHeaders();
            const response = await fetch(`${baseUrl}/extended/v1/address/${getMyStxAddress()}/stx` +
                (pollObject?.snapshotBlockHeight ? "?until_block=" + pollObject?.snapshotBlockHeight : ""),
                { headers });

            if (!response.ok) {
                console.error(`Failed to fetch STX holdings: ${response.status} ${response.statusText}`);
                setNoHoldingToken(true);
                return;
            }

            const responseObject = await response.json();

            if (responseObject?.balance !== "0") {
                // Convert STX balance to integer with out decimal places
                const stxBalance = Math.floor((parseInt(responseObject?.balance) / 1000000));
                setHoldingTokenIdsArray([]);
                setVotingPower(stxBalance);

                // Store the full STX balance
                setStacksBalance(parseInt(responseObject?.balance));
            } else {
                setNoHoldingToken(true);
            }
        } catch (error) {
            console.error("Error fetching STX holdings:", error);
            setNoHoldingToken(true);
        }
    }

    // Dust Transaction utility functions
    const fetchAllTransactionsForAddress = async (address, limit = 50, offset = 0) => {
        try {
            const url = `${getStacksAPIPrefix()}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`;
            const response = await fetch(url, { headers: getStacksAPIHeaders() });

            if (!response.ok) {
                console.error(`Failed to fetch transactions for ${address}: ${response.status} ${response.statusText}`);
                return { results: [], total: 0 };
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching transactions for ${address}:`, error);
            return { results: [], total: 0 };
        }
    };

    const getUniqueAddressesFromTransactions = (transactions) => {
        const uniqueAddresses = new Set();
        const addressToOptionMap = {};

        transactions.forEach(tx => {
            if (tx.sender_address && tx.token_transfer && tx.token_transfer.recipient_address) {
                uniqueAddresses.add(tx.sender_address);
                // Map sender to recipient (option they voted for)
                addressToOptionMap[tx.sender_address] = tx.token_transfer.recipient_address;
            }
        });

        return {
            addresses: Array.from(uniqueAddresses),
            addressToOptionMap
        };
    };

    const fetchStxBalanceAtSnapshot = async (address, snapshotHeight) => {
        try {
            const isMainnet = Constants.STACKS_MAINNET_FLAG;
            const baseUrl = isMainnet
                ? Constants.STACKS_QUICKNODE_API_URL
                : getStacksAPIPrefix();
            const url = `${baseUrl}/extended/v1/address/${address}/stx` +
                (snapshotHeight ? `?until_block=${snapshotHeight}` : "");
            const headers = isMainnet ? { "Accept": "application/json" } : getStacksAPIHeaders();
            const response = await fetch(url, { headers });

            if (!response.ok) {
                console.warn(`Failed to fetch STX balance for ${address}: ${response.status} ${response.statusText}`);
                return { total: 0, locked: 0, unlocked: 0 };
            }

            const responseObject = await response.json();

            // Extract locked and unlocked balances
            const lockedBalance = responseObject?.locked ? parseInt(responseObject.locked) : 0;
            const totalBalance = responseObject?.balance ? parseInt(responseObject.balance) : 0;
            const unlockedBalance = totalBalance - lockedBalance;

            return {
                total: Math.floor(totalBalance / 1000000),
                locked: Math.floor(lockedBalance / 1000000),
                unlocked: Math.floor(unlockedBalance / 1000000)
            };
        } catch (error) {
            console.warn(`Error fetching STX balance for ${address}:`, error);
            return { total: 0, locked: 0, unlocked: 0 };
        }
    };

    // Helper to process items in parallel batches
    const processInBatches = async (items, batchSize, worker) => {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(worker));
            results.push(...batchResults);
        }
        return results;
    };

    // Helper to extract values from Clarity list CV
    const extractClarityListValues = (value) => {
        if (Array.isArray(value)) {
            return value.map(v => {
                if (typeof v === 'object' && v !== null && 'value' in v) return v.value;
                return v;
            });
        }
        if (value && typeof value === 'object' && Array.isArray(value.value)) {
            return value.value.map(v => {
                if (typeof v === 'object' && v !== null && 'value' in v) return v.value;
                return v;
            });
        }
        return [];
    };

    // Fallback: parse Clarity repr string list like (list "opt1" "opt2")
    const parseReprStringList = (repr) => {
        if (!repr) return [];
        return [...repr.matchAll(/"([^"]*)"/g)].map(m => m[1]);
    };

    // Fallback: parse Clarity repr uint list like (list u100 u200)
    const parseReprUintList = (repr) => {
        if (!repr) return [];
        return [...repr.matchAll(/u(\d+)/g)].map(m => parseInt(m[1]));
    };

    // Fetch FT balance at snapshot height for recount
    const fetchFtBalanceAtSnapshot = async (address, snapshotHeight, strategyContractName, strategyTokenName, strategyTokenDecimals) => {
        try {
            const url = `${getStacksAPIPrefix()}/extended/v1/address/${address}/balances` +
                (snapshotHeight ? `?until_block=${snapshotHeight}` : "");
            const response = await fetch(url, { headers: getStacksAPIHeaders() });
            if (!response.ok) return 0;

            const data = await response.json();
            const tokenKey = `${strategyContractName}::${strategyTokenName}`;
            const tokenBalance = data?.fungible_tokens?.[tokenKey]?.balance;

            if (!tokenBalance || tokenBalance === "0") return 0;

            let tokenDecimalsPowerOfTen = 1000000;
            if (strategyTokenDecimals !== undefined && parseInt(strategyTokenDecimals) >= 0) {
                tokenDecimalsPowerOfTen = Math.pow(10, parseInt(strategyTokenDecimals));
            }

            return Math.floor(parseInt(tokenBalance) / tokenDecimalsPowerOfTen);
        } catch (error) {
            console.warn(`Error fetching FT balance for ${address}:`, error);
            return 0;
        }
    };

    // Recount votes by fetching contract transactions and recalculating with correct snapshot height
    const getRecountedResultsForPoll = async (pollObject) => {
        setRecountLoading(true);
        try {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            const snapshotHeight = pollObject?.snapshotBlockHeight;
            const contractId = `${contractAddress}.${contractName}`;

            if (!contractAddress || !contractName) return;

            console.log(`Recounting votes for contract ${contractId} at snapshot height ${snapshotHeight}...`);

            // Step 1: Fetch all transactions for the contract
            let allTransactions = [];
            let offset = 0;
            const limit = 50;
            let hasMore = true;

            while (hasMore) {
                const txData = await fetchAllTransactionsForAddress(contractId, limit, offset);
                if (txData.results) {
                    allTransactions = [...allTransactions, ...txData.results];
                }
                hasMore = txData.results?.length === limit && allTransactions.length < txData.total;
                offset += limit;
                if (offset > 10000) break;
            }

            console.log(`  Found ${allTransactions.length} total transactions for contract`);

            // Step 2: Filter for cast-my-vote calls (including failed transactions)
            const voteTransactions = allTransactions.filter(tx =>
                tx.tx_type === 'contract_call' &&
                tx.contract_call?.function_name === 'cast-my-vote'
            );

            console.log(`  Found ${voteTransactions.length} vote transactions (success + failed)`);

            if (voteTransactions.length === 0) {
                setTotalVotes(0);
                setTotalUniqueVotes(0);
                setNoOfResultsLoaded(0);
                return;
            }

            // Step 3: Parse vote data from each transaction's function arguments
            const voterData = [];
            for (const tx of voteTransactions) {
                const voteArg = tx.contract_call?.function_args?.find(arg => arg.name === 'vote');
                const volumeArg = tx.contract_call?.function_args?.find(arg => arg.name === 'volume');

                let voteOptions = [];
                let voteVolumes = [];

                // Parse vote options (list of string-ascii option IDs)
                if (voteArg?.hex) {
                    try {
                        const value = cvToValue(hexToCV(voteArg.hex));
                        voteOptions = extractClarityListValues(value);
                    } catch (e) {
                        voteOptions = parseReprStringList(voteArg?.repr);
                    }
                }

                // Parse vote volumes (list of uint)
                if (volumeArg?.hex) {
                    try {
                        const value = cvToValue(hexToCV(volumeArg.hex));
                        voteVolumes = extractClarityListValues(value).map(v => parseInt(v));
                    } catch (e) {
                        voteVolumes = parseReprUintList(volumeArg?.repr);
                    }
                }

                if (voteOptions.length > 0) {
                    voterData.push({
                        address: tx.sender_address,
                        voteOptions,
                        voteVolumes,
                        txId: tx.tx_id
                    });
                }
            }

            console.log(`  Parsed ${voterData.length} voter records`);

            // Step 4: Fetch each voter's balance at the correct snapshot height
            const uniqueAddresses = [...new Set(voterData.map(v => v.address))];
            const pollIdForCache = pollObject?.id || contractId;
            let balanceMap = {};

            if (pollObject?.votingStrategyTemplate === 'stx' || !pollObject?.strategyContractName) {
                // STX strategy - use existing dust voting cache mechanism
                const balanceResults = await processDustVotingBalancesWithCache(
                    uniqueAddresses, `${pollIdForCache}-recount`, snapshotHeight
                );
                for (const { voterAddress, balanceData } of balanceResults) {
                    balanceMap[voterAddress] = {
                        total: balanceData.total,
                        locked: balanceData.locked,
                        unlocked: balanceData.unlocked
                    };
                }
            } else if (pollObject?.strategyContractName && pollObject?.strategyTokenName) {
                // FT strategy - fetch token balances
                for (const address of uniqueAddresses) {
                    const balance = await fetchFtBalanceAtSnapshot(
                        address, snapshotHeight,
                        pollObject.strategyContractName,
                        pollObject.strategyTokenName,
                        pollObject.strategyTokenDecimals
                    );
                    balanceMap[address] = { total: balance, locked: 0, unlocked: balance };
                }
            }

            console.log(`  Fetched balances for ${uniqueAddresses.length} unique voters`);

            // Step 5: Recalculate results based on voting system
            const recountedResults = {};
            let recountedTotalVotes = 0;

            // Initialize options
            pollObject?.options?.forEach(option => {
                recountedResults[option.id] = {
                    total: 0,
                    percentage: "0.00",
                    lockedStx: "0",
                    unlockedStx: "0"
                };
            });

            // Build individual results for display
            const recountedResultsByPosition = {};
            let voteIndex = 0;

            for (const voter of voterData) {
                const balance = balanceMap[voter.address];
                if (!balance || balance.total <= 0) continue;

                const votingPower = balance.total;
                let voterTotalVotes = 0;

                if (pollObject?.votingSystem === 'fptp' || pollObject?.votingSystem === 'block') {
                    // FPTP/Block: each selected option gets the full voting power
                    voter.voteOptions.forEach(optionId => {
                        if (recountedResults[optionId]) {
                            recountedResults[optionId].total += votingPower;
                            recountedResults[optionId].lockedStx = String(
                                parseInt(recountedResults[optionId].lockedStx) + balance.locked
                            );
                            recountedResults[optionId].unlockedStx = String(
                                parseInt(recountedResults[optionId].unlockedStx) + balance.unlocked
                            );
                        }
                    });
                    voterTotalVotes = votingPower;
                    recountedTotalVotes += votingPower;
                } else if (pollObject?.votingSystem === 'weighted') {
                    // Weighted: use original volume distribution, scale if needed
                    const totalVolume = voter.voteVolumes.reduce((a, b) => a + b, 0);
                    if (totalVolume > 0) {
                        const scale = votingPower >= totalVolume ? 1 : votingPower / totalVolume;
                        voter.voteOptions.forEach((optionId, i) => {
                            const votes = scale === 1 ? voter.voteVolumes[i] : Math.floor(voter.voteVolumes[i] * scale);
                            if (recountedResults[optionId]) {
                                recountedResults[optionId].total += votes;
                            }
                            voterTotalVotes += votes;
                            recountedTotalVotes += votes;
                        });
                    }
                } else if (pollObject?.votingSystem === 'quadratic') {
                    // Quadratic: preserve volumes if within new voting power
                    const quadraticCost = voter.voteVolumes.reduce((a, v) => a + v * v, 0);
                    if (votingPower >= quadraticCost) {
                        voter.voteOptions.forEach((optionId, i) => {
                            if (recountedResults[optionId]) {
                                recountedResults[optionId].total += voter.voteVolumes[i];
                            }
                            voterTotalVotes += voter.voteVolumes[i];
                            recountedTotalVotes += voter.voteVolumes[i];
                        });
                    }
                }

                // Build position-based result for individual vote display
                // Must match the flat format expected by ModernVotingActivity:
                // { address, vote: {optionId: count}, votingPower, lockedStx, unlockedStx }
                voteIndex++;
                const voteObj = {};
                voter.voteOptions.forEach((optionId, i) => {
                    if (pollObject?.votingSystem === 'fptp' || pollObject?.votingSystem === 'block') {
                        voteObj[optionId] = votingPower;
                    } else {
                        voteObj[optionId] = voter.voteVolumes[i] || 0;
                    }
                });
                recountedResultsByPosition[voteIndex] = {
                    address: voter.address,
                    vote: voteObj,
                    votingPower: votingPower,
                    lockedStx: String(balance.locked || 0),
                    unlockedStx: String(balance.unlocked || 0)
                };
            }

            // Calculate percentages
            for (const optionId in recountedResults) {
                recountedResults[optionId].percentage = recountedTotalVotes > 0
                    ? ((recountedResults[optionId].total / recountedTotalVotes) * 100).toFixed(2)
                    : "0.00";
            }

            console.log(`  Recount complete: ${recountedTotalVotes} total votes from ${voterData.length} voters`);

            // Step 6: Override the regular results with recounted values
            setResultsByOption(recountedResults);
            setTotalVotes(recountedTotalVotes);
            setTotalUniqueVotes(voterData.length);
            setResultsByPosition(recountedResultsByPosition);
            setNoOfResultsLoaded(voterData.length);
        } catch (error) {
            console.error("Error recounting votes:", error);
        } finally {
            setRecountLoading(false);
        }
    };

    const getDustVotingResultsForPoll = async (pollObject) => {
        setDustVotingLoading(true);
        try {
            const snapshotHeight = pollObject?.snapshotBlockHeight;

            // Filter options that have dust transaction configuration
            const dustOptions = pollObject?.options?.filter(option =>
                option.dustAddress && option.dustAmount && option.dustAmount > 0
            );

            // No dust options found
            if (!dustOptions || dustOptions.length === 0) {
                return;
            }

            // Process each dust option to collect voting data
            const dustOptionResults = {};
            const allDustVoters = {};

            // Loop through each dust option
            for (const option of dustOptions) {
                const dustAddress = option.dustAddress;
                const dustAmount = option.dustAmount;

                // Get all transactions for this option's dust address
                let allTransactions = [];
                let offset = 0;

                // Set limit
                const limit = 50;
                let hasMore = true;

                while (hasMore) {
                    const txData = await fetchAllTransactionsForAddress(dustAddress, limit, offset);
                    if (txData.results) {
                        allTransactions = [...allTransactions, ...txData.results];
                    }

                    hasMore = txData.results && txData.results.length === limit && allTransactions.length < txData.total;
                    offset += limit;

                    // Safety check to prevent infinite loops
                    if (offset > 10000) break;
                }

                // Filter transactions by this option's exact dust amount and Bitcoin block height range
                const dustTransactions = allTransactions.filter(tx => {
                    // Check if transaction is within poll's Bitcoin block height range (burn_block_height)
                    const txBurnBlockHeight = tx.burn_block_height;
                    const isWithinBlockRange = txBurnBlockHeight >= pollObject?.startAtBlock && 
                                               txBurnBlockHeight <= pollObject?.endAtBlock;
                    
                    return tx.tx_type === 'token_transfer' &&
                        tx.token_transfer &&
                        tx.token_transfer.recipient_address.toLowerCase() === dustAddress.toLowerCase() &&
                        isWithinBlockRange;
                });

                // Get unique voter addresses for this option
                const uniqueVoters = [...new Set(dustTransactions.map(tx => tx.sender_address).filter(Boolean))];

                // Initialize results for this option
                dustOptionResults[option.id] = {
                    optionId: option.id,
                    optionValue: option.value,
                    dustAddress: dustAddress,
                    dustAmount: dustAmount,
                    totalVoters: 0,
                    totalStx: 0,
                    totalLockedStx: 0,
                    totalUnlockedStx: 0,
                    totalTransactions: dustTransactions.length,
                    voterAddresses: []
                };

                // Process each voter's STX balance using caching
                const pollId = pollObject?.id || pollObject?.contractAddress;
                const balanceResults = await processDustVotingBalancesWithCache(
                    uniqueVoters,
                    pollId,
                    snapshotHeight
                );

                // Process the balance results
                for (const { voterAddress, balanceData } of balanceResults) {
                    if (balanceData.total > 0) {
                        // Add voter to this option's results
                        dustOptionResults[option.id].totalVoters++;
                        dustOptionResults[option.id].totalStx += balanceData.total;
                        dustOptionResults[option.id].totalLockedStx += balanceData.locked;
                        dustOptionResults[option.id].totalUnlockedStx += balanceData.unlocked;
                        dustOptionResults[option.id].voterAddresses.push({
                            address: voterAddress,
                            stxBalance: balanceData.total,
                            lockedStx: balanceData.locked,
                            unlockedStx: balanceData.unlocked
                        });

                        // Track this voter globally
                        if (!allDustVoters[voterAddress]) {
                            allDustVoters[voterAddress] = {
                                stxBalance: balanceData.total,
                                lockedStx: balanceData.locked,
                                unlockedStx: balanceData.unlocked,
                                votedOptions: [],
                                hasVoted: true
                            };
                        }

                        // Add this option to voter's voted options
                        allDustVoters[voterAddress].votedOptions.push({
                            optionId: option.id,
                            optionValue: option.value,
                            dustAmount: dustAmount
                        });
                    }
                }
            }

            // Check if current user has already voted via dust transactions
            const currentUserAddress = userSession.isUserSignedIn() ? getMyStxAddress() : null;
            if (userSession.isUserSignedIn() && currentUserAddress && allDustVoters[currentUserAddress]) {
                setUserDustVotingStatus(allDustVoters[currentUserAddress]);
                setAlreadyVoted(true);
            }

            // Create dust voters list for UI display
            const dustVotersList = Object.keys(allDustVoters).map(address => ({
                address,
                ...allDustVoters[address],
                isCurrentUser: userSession.isUserSignedIn() && currentUserAddress && address === currentUserAddress
            }));
            setDustVotersList(dustVotersList);

            // Store dust voting data for UI access
            setDustVotingResults(dustOptionResults);
            setDustVotingMap(allDustVoters);
        } catch (error) {
            console.error("Error fetching dust voting results for poll:", error);
        } finally {
            setDustVotingLoading(false);
        }
    };

    const getBtcVotingResultsForPoll = async (pollObject) => {
        setBtcVotingLoading(true);
        try {
            const btcVotingData = await processBtcVotesForPoll(pollObject);

            if (btcVotingData) {
                const { btcVotingResults, btcVotingMap, btcVotersList } = btcVotingData;

                // Check if current user has already voted via BTC transactions
                const currentUserAddress = userSession.isUserSignedIn() ? getMyStxAddress() : null;
                if (currentUserAddress) {
                    const userBtcStatus = checkUserBtcVotingStatus(currentUserAddress, btcVotingMap);
                    if (userBtcStatus) {
                        setUserBtcVotingStatus(userBtcStatus);
                        setAlreadyVoted(true);
                    }
                }

                // Set BTC voting data for UI access
                setBtcVotingResults(btcVotingResults);
                setBtcVotingMap(btcVotingMap);
                setBtcVotersList(btcVotersList);
            }
        } catch (error) {
        } finally {
            setBtcVotingLoading(false);
        }
    };

    const getPollResults = async (pollObject) => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            try {
                const contractAddress = pollObject?.publishedInfo?.contractAddress;
                const contractName = pollObject?.publishedInfo?.contractName;
                const url = getStacksAPIPrefix() +
                    "/v2/contracts/call-read/" +
                    contractAddress +
                    "/" +
                    contractName +
                    "/get-results";

                // Fetch poll results from stacks blockchain
                const rawResponse = await fetch(url, {
                    method: "POST",
                    headers: getStacksAPIHeaders({
                        "Content-Type": "application/json"
                    }),
                    body: JSON.stringify({
                        sender: contractAddress,
                        arguments: []
                    }),
                });

                if (!rawResponse.ok) {
                    console.error(`Failed to fetch poll results: ${rawResponse.status} ${rawResponse.statusText}`);
                    setTotalVotes(0);
                    setTotalUniqueVotes(0);
                    setNoOfResultsLoaded(0);
                    return;
                }

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
                            percentage: results?.results?.value?.[index]?.value === 0 ? 0 : ((results?.results?.value?.[index]?.value / total) * 100).toFixed(2),
                            lockedStx: results?.["results-with-locked-and-unlocked-stx"]?.value?.[index]?.value?.["locked-stx"]?.value || "0",
                            unlockedStx: results?.["results-with-locked-and-unlocked-stx"]?.value?.[index]?.value?.["unlocked-stx"]?.value || "0"
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
            } catch (error) {
                console.error("Error fetching poll results:", error);
                setTotalVotes(0);
                setTotalUniqueVotes(0);
                setNoOfResultsLoaded(0);
            }
        }
    };

    const getResultByUser = async (pollObject) => {
        if (userSession.isUserSignedIn() &&
            pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            try {
                const contractAddress = pollObject?.publishedInfo?.contractAddress;
                const contractName = pollObject?.publishedInfo?.contractName;
                const url = getStacksAPIPrefix() +
                    "/v2/contracts/call-read/" +
                    contractAddress +
                    "/" +
                    contractName +
                    "/get-result-by-user";

                // Fetch user vote status from stacks blockchain
                const rawResponse = await fetch(url, {
                    method: "POST",
                    headers: getStacksAPIHeaders({
                        "Content-Type": "application/json"
                    }),
                    body: JSON.stringify({
                        sender: contractAddress,
                        arguments: [cvToHex(standardPrincipalCV(getMyStxAddress()))]
                    }),
                });

                if (!rawResponse.ok) {
                    console.error(`Failed to fetch user vote status: ${rawResponse.status} ${rawResponse.statusText}`);
                    return;
                }

                const content = await rawResponse.json();

                // If data found on stacks blockchain
                if (content && content.okay) {
                    const results = cvToValue(parseReadOnlyResponse(content)).value;

                    if (results) {
                        setAlreadyVoted(true);

                        // Parse user's vote data
                        const userVote = {};
                        results?.value?.vote?.value?.forEach((optionId, index) => {
                            const voteValue = results?.value?.volume?.value?.[index]?.value;
                            if (optionId?.value && voteValue) {
                                userVote[optionId.value] = voteValue;
                            }
                        });
                        setUserVoteData(userVote);
                    }
                }
            } catch (error) {
                console.error("Error fetching user vote status:", error);
                // Don't set alreadyVoted on error - allow user to try voting
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

            {/* Navigation */}
            <DashboardNavBarComponent isPollPage={true} />

            {/* Main Poll Content */}
            <PollComponent
                pollObject={pollObject}
                optionsMap={optionsMap}
                resultsByOption={resultsByOption}
                resultsByPosition={resultsByPosition}
                setResultsByPosition={setResultsByPosition}
                totalVotes={totalVotes}
                totalUniqueVotes={totalUniqueVotes}
                dns={dns}
                alreadyVoted={alreadyVoted}
                userVoteData={userVoteData}
                noHoldingToken={noHoldingToken}
                holdingTokenIdsArray={holdingTokenIdsArray}
                votingPower={votingPower}
                publicUrl={publicUrl}
                txStatus={txStatus}
                noOfResultsLoaded={noOfResultsLoaded}
                setNoOfResultsLoaded={setNoOfResultsLoaded}
                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                currentStacksBlockHeight={currentStacksBlockHeight}
                stacksBalance={stacksBalance}
                dustVotingMap={dustVotingMap}
                userDustVotingStatus={userDustVotingStatus}
                dustVotingResults={dustVotingResults}
                dustVotersList={dustVotersList}
                dustVotingLoading={dustVotingLoading}
                btcVotingMap={btcVotingMap}
                userBtcVotingStatus={userBtcVotingStatus}
                btcVotingResults={btcVotingResults}
                btcVotersList={btcVotersList}
                btcVotingLoading={btcVotingLoading}
                recountLoading={recountLoading}
            />
        </>
    );
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