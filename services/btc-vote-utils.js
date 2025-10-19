import axios from 'axios';
import { getStacksAPIHeaders, getStacksAPIPrefix } from './auth';

const MEMPOOL_API = 'https://mempool.space/api';
const PAGE_LIMIT = 50;
const RETRY_LIMIT = 18;
const RETRY_DELAY_MS = 10_000;

const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * Fetch with retry mechanism for API calls
 */
const fetchWithRetry = async (url, retries = RETRY_LIMIT) => {
    try {
        const { data } = await axios.get(url, { headers: getStacksAPIHeaders() });
        return data;
    } catch (err) {
        if (retries > 0) {
            await sleep(RETRY_DELAY_MS);
            return fetchWithRetry(url, retries - 1);
        }
        throw err;
    }
};

/**
 * Get Bitcoin transactions for a specific address
 */
export const getBitcoinTransactionsForAddress = async (btcAddress) => {
    const events = [];

    try {
        const url = `${MEMPOOL_API}/address/${btcAddress}/txs?limit=${PAGE_LIMIT}`;
        const txs = await axios.get(url).then(res => res.data);

        for (const tx of txs) {
            if (!tx.status.confirmed) continue;
            tx.vin.forEach(vin => {
                if (vin.prevout && vin.prevout.scriptpubkey_address) {
                    events.push({
                        address: vin.prevout.scriptpubkey_address,
                        txId: tx.txid,
                        blockHeight: tx.status.block_height,
                        confirmed: tx.status.confirmed
                    });
                }
            });
        }

        console.log(`  Fetched ${txs.length} BTC transactions for ${btcAddress}`);
        return events;
    } catch (error) {
        console.error(`Error fetching Bitcoin transactions for ${btcAddress}:`, error);
        return [];
    }
};

/**
 * Build mapping from BTC addresses to STX addresses for given PoX cycles
 */
export const buildBtcToStacksMapping = async (poxCycles) => {
    const map = new Map();

    for (const cycle of poxCycles) {
        let signerOffset = 0, signerTotal = Infinity;

        while (signerOffset < signerTotal) {
            try {
                const url = `${getStacksAPIPrefix()}/extended/v2/pox/cycles/${cycle}/signers?limit=${PAGE_LIMIT}&offset=${signerOffset}`;
                const { total, results: signers } = await fetchWithRetry(url);
                signerTotal = total;
                signerOffset += PAGE_LIMIT;

                for (const { signing_key } of signers) {
                    let stackerOffset = 0, stackerTotal = Infinity;

                    while (stackerOffset < stackerTotal) {
                        try {
                            const sUrl = `${getStacksAPIPrefix()}/extended/v2/pox/cycles/${cycle}/signers/${signing_key}/stackers?limit=${PAGE_LIMIT}&offset=${stackerOffset}`;
                            const { total: sTotal, results: stackers } = await fetchWithRetry(sUrl);
                            stackerTotal = sTotal;
                            stackerOffset += PAGE_LIMIT;

                            for (const { pox_address, stacker_address } of stackers) {
                                if (!map.has(pox_address)) {
                                    map.set(pox_address, []);
                                }
                                map.get(pox_address).push(stacker_address);
                            }
                        } catch (error) {
                            console.error(`Error fetching stackers for cycle ${cycle}, signer ${signing_key}:`, error);
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error fetching signers for cycle ${cycle}:`, error);
                break;
            }
        }
    }

    return map;
};

/**
 * Get STX balance information for a given address at a specific block height
 */
export const getStxBalanceAtHeight = async (stxAddress, blockHeight = null) => {
    try {
        const url = `${getStacksAPIPrefix()}/extended/v1/address/${stxAddress}/stx` +
            (blockHeight ? `?until_block=${blockHeight}` : "");

        const { locked, balance } = await fetchWithRetry(url);
        const lockedNum = Number(locked);
        const balanceNum = Number(balance);

        return {
            address: stxAddress,
            locked: lockedNum > 0 ? Math.floor(lockedNum / 1e6) : 0,
            unlocked: balanceNum > 0 && balanceNum >= lockedNum ? Math.floor((balanceNum - lockedNum) / 1e6) : 0,
            total: balanceNum > 0 ? Math.floor(balanceNum / 1e6) : 0,
        };
    } catch (error) {
        console.error(`Error fetching STX balance for ${stxAddress}:`, error);
        return {
            address: stxAddress,
            locked: 0,
            unlocked: 0,
            total: 0,
        };
    }
};

/**
 * Process BTC votes for poll options that have BTC addresses and PoX cycles
 */
export const processBtcVotesForPoll = async (pollObject) => {
    try {
        // Check if any options have BTC address and PoX cycle details
        const btcOptions = pollObject?.options?.filter(async (option) => {
            if (!option.dustBtcAddress || !option.poxCycles) return false;

            // Check if address has any transactions
            const btcTransactions = await getBitcoinTransactionsForAddress(option.dustBtcAddress);
            if (!btcTransactions || btcTransactions.length === 0) return false;

            // Handle both string (comma-separated) and array formats
            if (typeof option.poxCycles === 'string') {
                return option.poxCycles.trim().length > 0;
            }

            return Array.isArray(option.poxCycles) && option.poxCycles.length > 0;
        }).map(option => {
            // Normalize poxCycles to array format
            let poxCycles = option.poxCycles;
            if (typeof poxCycles === 'string') {
                poxCycles = poxCycles.split(',').map(cycle => parseInt(cycle.trim())).filter(cycle => !isNaN(cycle));
            }

            return {
                ...option,
                poxCycles
            };
        });

        if (!btcOptions || btcOptions.length === 0) {
            console.log('No BTC voting options found in this poll');
            return null;
        }

        // Build BTC to STX mapping for all unique PoX cycles
        const allPoxCycles = [...new Set(btcOptions.flatMap(option => {
            // Convert string of comma-separated cycles to array of numbers
            const cycles = typeof option.poxCycles === 'string'
                ? option.poxCycles.split(',').map(cycle => parseInt(cycle.trim())).filter(cycle => !isNaN(cycle))
                : option.poxCycles;
            return cycles;
        }))];
        const btcToStxMap = await buildBtcToStacksMapping(allPoxCycles);

        const btcVotingResults = {};
        const allBtcVoters = {};

        // Process each BTC option
        for (const option of btcOptions) {
            const btcAddress = option.dustBtcAddress;
            const poxCycles = option.poxCycles;

            // Get Bitcoin transactions for this address
            const btcTransactions = await getBitcoinTransactionsForAddress(btcAddress);

            // Map BTC addresses to STX addresses
            const validStxAddresses = btcTransactions.flatMap(tx =>
                btcToStxMap.get(tx.address) || []
            );

            // Get unique STX addresses
            const uniqueStxAddresses = [...new Set(validStxAddresses)];

            // Initialize results for this option
            btcVotingResults[option.id] = {
                optionId: option.id,
                optionValue: option.value,
                btcAddress: btcAddress,
                poxCycles: poxCycles,
                totalVoters: 0,
                totalStx: 0,
                totalLockedStx: 0,
                totalUnlockedStx: 0,
                totalTransactions: btcTransactions.length,
                voterAddresses: []
            };

            // Process each unique STX address
            for (const stxAddress of uniqueStxAddresses) {
                const balanceData = await getStxBalanceAtHeight(
                    stxAddress,
                    pollObject?.snapshotBlockHeight
                );

                if (balanceData.total > 0) {
                    // Add voter to this option's results
                    btcVotingResults[option.id].totalVoters++;
                    btcVotingResults[option.id].totalStx += balanceData.total;
                    btcVotingResults[option.id].totalLockedStx += balanceData.locked;
                    btcVotingResults[option.id].totalUnlockedStx += balanceData.unlocked;
                    btcVotingResults[option.id].voterAddresses.push({
                        stxAddress: stxAddress,
                        btcAddresses: btcTransactions
                            .filter(tx => btcToStxMap.get(tx.address)?.includes(stxAddress))
                            .map(tx => tx.address),
                        stxBalance: balanceData.total,
                        lockedStx: balanceData.locked,
                        unlockedStx: balanceData.unlocked
                    });

                    // Track this voter globally
                    if (!allBtcVoters[stxAddress]) {
                        allBtcVoters[stxAddress] = {
                            stxAddress: stxAddress,
                            stxBalance: balanceData.total,
                            lockedStx: balanceData.locked,
                            unlockedStx: balanceData.unlocked,
                            votedOptions: [],
                            hasVoted: true
                        };
                    }

                    // Add this option to voter's voted options
                    allBtcVoters[stxAddress].votedOptions.push({
                        optionId: option.id,
                        optionValue: option.value,
                        btcAddress: btcAddress
                    });
                }
            }
        }

        // Create BTC voters list for UI display
        const btcVotersList = Object.keys(allBtcVoters).map(stxAddress => ({
            address: stxAddress,
            ...allBtcVoters[stxAddress]
        }));

        return {
            btcVotingResults,
            btcVotingMap: allBtcVoters,
            btcVotersList
        };

    } catch (error) {
        console.error('Error processing BTC votes for poll:', error);
        return null;
    }
};

/**
 * Check if current user has voted via BTC transactions
 */
export const checkUserBtcVotingStatus = (currentUserStxAddress, btcVotingMap) => {
    if (!currentUserStxAddress || !btcVotingMap) {
        return null;
    }

    return btcVotingMap[currentUserStxAddress] || null;
};