import axios from 'axios';
import { Constants } from '../common/constants';
import { getApiKey, getStacksAPIHeaders, getStacksAPIPrefix } from './auth';
import { getStxDustVotingSnapshotUrl } from './r2-storage';

/**
 * Try to fetch cached STX dust voting snapshot from CloudFlare R2
 */
const fetchCachedStxDustVotingSnapshot = async (pollId, snapshotHeight) => {
    try {
        const network = Constants.STACKS_MAINNET_FLAG ? 'mainnet' : 'testnet';
        const url = getStxDustVotingSnapshotUrl(pollId, snapshotHeight, network);
        const response = await axios.get(url, { timeout: 15000 });

        if (response.data && response.data.walletBalances) {
            return response.data.walletBalances;
        }

        return null;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`  No cached STX dust voting snapshot found for poll ${pollId} at height ${snapshotHeight}`);
            return null;
        }
        console.warn(`  Error fetching cached STX dust voting snapshot:`, error.message);
        return null;
    }
};

/**
 * Store STX dust voting snapshot to CloudFlare R2 via API
 */
const storeStxDustVotingSnapshotToR2 = async (pollId, snapshotHeight, walletBalances) => {
    try {
        const apiKey = await getApiKey();
        const response = await axios.post(`/api/stacks/stx-dust-voting/${pollId}`, {
            snapshotHeight: snapshotHeight,
            walletBalances: walletBalances
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 201 || response.status === 200) {
            return true;
        }

        return false;
    } catch (error) {
        if (error.response?.status === 200) {
            return true; // Data already exists, consider success
        }
        console.warn(`  Error storing STX dust voting snapshot to R2:`, error.message);
        return false;
    }
};

/**
 * Fetch STX balance at snapshot height for a given address
 */
export const fetchStxBalanceAtSnapshot = async (address, snapshotHeight) => {
    try {
        const url = `${getStacksAPIPrefix()}/extended/v1/address/${address}/stx` +
            (snapshotHeight ? `?until_block=${snapshotHeight}` : "");
        const response = await fetch(url, { headers: getStacksAPIHeaders() });

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

/**
 * Process STX dust voting balances with caching
 * @param {Array} uniqueVoters - Array of unique voter addresses
 * @param {string} pollId - Poll ID (contract address)
 * @param {number} snapshotHeight - Snapshot block height
 * @returns {Array} Array of balance results { voterAddress, balanceData }
 */
export const processDustVotingBalancesWithCache = async (uniqueVoters, pollId, snapshotHeight) => {
    let cachedBalances = null;
    let balancesToCache = {};
    
    // Try to fetch cached balances first
    if (pollId && snapshotHeight) {
        cachedBalances = await fetchCachedStxDustVotingSnapshot(pollId, snapshotHeight);
        if (cachedBalances) {
            console.log(`  Using cached STX dust voting balances for ${Object.keys(cachedBalances).length} addresses`);
        }
    }

    const balanceResults = [];
    
    // Fetch balances - use cache or make API calls
    for (const voterAddress of uniqueVoters) {
        let balanceData;
        
        // Check if we have cached data for this address
        if (cachedBalances && cachedBalances[voterAddress]) {
            balanceData = cachedBalances[voterAddress];
        } else {
            // Fetch from API
            balanceData = await fetchStxBalanceAtSnapshot(voterAddress, snapshotHeight);
            // Store for caching later
            balancesToCache[voterAddress] = {
                locked: balanceData.locked,
                unlocked: balanceData.unlocked,
                total: balanceData.total
            };
        }
        
        balanceResults.push({ voterAddress, balanceData });
    }

    // Store newly fetched balances to R2 if we fetched any
    if (Object.keys(balancesToCache).length > 0 && pollId && snapshotHeight) {
        console.log(`  Caching ${Object.keys(balancesToCache).length} newly fetched STX dust voting balances...`);
        try {
            // Merge with existing cached balances if any
            const allBalances = cachedBalances ? { ...cachedBalances, ...balancesToCache } : balancesToCache;
            await storeStxDustVotingSnapshotToR2(pollId, snapshotHeight, allBalances);
            console.log(`  Successfully cached STX dust voting snapshot`);
        } catch (storageError) {
            console.warn(`  Failed to cache STX dust voting balances:`, storageError.message);
        }
    }

    return balanceResults;
};
