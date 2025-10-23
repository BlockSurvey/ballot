import axios from 'axios';
import { Constants } from '../common/constants';
import { getApiKey, getStacksAPIHeaders, getStacksAPIPrefix } from './auth';
import { getPoxCycleMappingUrl } from './r2-storage';

const MEMPOOL_API = 'https://mempool.space/api';
const PAGE_LIMIT = 50;
const RETRY_LIMIT = 18;
const RETRY_DELAY_MS = 10_000;

const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * Try to fetch cached PoxCycle mapping from CloudFlare R2
 */
const fetchCachedPoxCycleMapping = async (poxCycle) => {
    try {
        const network = Constants.STACKS_MAINNET_FLAG ? 'mainnet' : 'testnet';
        const url = getPoxCycleMappingUrl(poxCycle, network);
        const response = await axios.get(url, { timeout: 15000 });

        if (response.data && response.data.mapping) {
            return response.data.mapping;
        }

        return null;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`  No cached mapping found for PoX cycle ${poxCycle}`);
            return null;
        }
        console.warn(`  Error fetching cached mapping for PoX cycle ${poxCycle}:`, error.message);
        return null;
    }
};

/**
 * Store PoxCycle mapping to CloudFlare R2 via API
 * Note: This requires a valid API key to be available in the application context
 */
const storePoxCycleMappingToR2 = async (poxCycle, mappingData) => {
    try {
        // Convert Map to plain object for storage
        const mappingObject = {};
        if (mappingData instanceof Map) {
            for (const [key, value] of mappingData.entries()) {
                mappingObject[key] = value;
            }
        } else {
            Object.assign(mappingObject, mappingData);
        }

        const apiKey = await getApiKey();
        const response = await axios.post('/api/stacks/pox-cycles', {
            poxCycle: poxCycle,
            mapping: mappingObject,
            network: Constants.STACKS_MAINNET_FLAG ? 'mainnet' : 'testnet'
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 201) {
            return true;
        }

        return false;
    } catch (error) {
        if (error.response?.status === 409) {
            return true; // Consider this a success since data exists
        }
        console.warn(`  Error storing PoX cycle ${poxCycle} mapping to R2:`, error.message);
        return false;
    }
};

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

        return events;
    } catch (error) {
        console.error(`Error fetching Bitcoin transactions for ${btcAddress}:`, error);
        return [];
    }
};

/**
 * Build mapping for a single PoX cycle from the Stacks API
 */
const buildSingleCycleMapping = async (cycle) => {
    const cycleMap = new Map();
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
                            if (!cycleMap.has(pox_address)) {
                                cycleMap.set(pox_address, []);
                            }
                            cycleMap.get(pox_address).push(stacker_address);
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

    return cycleMap;
};

/**
 * Build mapping from BTC addresses to STX addresses for given PoX cycles
 * First checks CloudFlare R2 cache, then builds from API if needed
 */
export const buildBtcToStacksMapping = async (poxCycles) => {
    const finalMap = new Map();
    const cyclesToProcess = [];

    // First, try to fetch cached mappings from R2
    for (const cycle of poxCycles) {
        try {
            const cachedMapping = await fetchCachedPoxCycleMapping(cycle);

            if (cachedMapping) {
                // Merge cached mapping into final map
                Object.entries(cachedMapping).forEach(([btcAddress, stxAddresses]) => {
                    if (!finalMap.has(btcAddress)) {
                        finalMap.set(btcAddress, []);
                    }
                    const existingAddresses = finalMap.get(btcAddress);
                    stxAddresses.forEach(address => {
                        if (!existingAddresses.includes(address)) {
                            existingAddresses.push(address);
                        }
                    });
                });
            } else {
                // Need to process this cycle
                cyclesToProcess.push(cycle);
            }
        } catch (error) {
            console.warn(`Error checking cache for PoX cycle ${cycle}:`, error.message);
            cyclesToProcess.push(cycle);
        }
    }

    // Process uncached cycles
    if (cyclesToProcess.length > 0) {
        for (const cycle of cyclesToProcess) {
            try {
                // Build mapping from API
                const cycleMap = await buildSingleCycleMapping(cycle);

                // Merge into final map
                cycleMap.forEach((stxAddresses, btcAddress) => {
                    if (!finalMap.has(btcAddress)) {
                        finalMap.set(btcAddress, []);
                    }
                    const existingAddresses = finalMap.get(btcAddress);
                    stxAddresses.forEach(address => {
                        if (!existingAddresses.includes(address)) {
                            existingAddresses.push(address);
                        }
                    });
                });

                // Try to store in R2 cache for future use
                // Note: This requires an API key - implement according to your auth flow
                // For now, we'll skip automatic caching and let users manually cache via the API
                try {
                    await storePoxCycleMappingToR2(cycle, cycleMap);
                } catch (storageError) {
                    console.warn(`Failed to cache PoX cycle ${cycle} mapping:`, storageError.message);
                }

            } catch (error) {
                console.error(`Failed to process PoX cycle ${cycle}:`, error);
            }
        }
    }

    return finalMap;
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
        const btcOptions = (pollObject?.options || [])
            .filter((option) => {
                if (!option.dustBtcAddress || !option.poxCycles) return false;
                // We don't await here; we'll fetch txs later to avoid async filter issues
                if (typeof option.poxCycles === 'string') {
                    return option.poxCycles.trim().length > 0;
                }
                return Array.isArray(option.poxCycles) && option.poxCycles.length > 0;
            })
            .map(option => {
                // Normalize poxCycles to array format
                let poxCycles = option.poxCycles;
                if (typeof poxCycles === 'string') {
                    poxCycles = poxCycles.split(',').map(cycle => parseInt(cycle.trim())).filter(cycle => !isNaN(cycle));
                }
                return { ...option, poxCycles };
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

            // If no transactions, skip option early
            if (!btcTransactions || btcTransactions.length === 0) {
                continue;
            }

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

            // Fetch balances in parallel batches of 50
            const balanceResults = await processInBatches(uniqueStxAddresses, 5, (stxAddress) =>
                getStxBalanceAtHeight(stxAddress, pollObject?.snapshotBlockHeight)
                    .then(balanceData => ({ stxAddress, balanceData }))
            );

            // Process results
            for (const { stxAddress, balanceData } of balanceResults) {
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