import { Constants } from '../common/constants';

// CloudFlare R2 configuration for client-side URL generation
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://storage.ballot.gg';

/**
 * Get network suffix based on STACKS_MAINNET_FLAG
 */
const getNetworkSuffix = () => {
    return Constants.STACKS_MAINNET_FLAG ? 'mainnet' : 'testnet';
};

/**
 * Get the public URL for a PoxCycle mapping
 * @param {number} poxCycleNumber - The PoX cycle number
 * @param {string} network - Optional network override ('mainnet' or 'testnet')
 * @returns {string} - The public URL
 */
export const getPoxCycleMappingUrl = (poxCycleNumber, network = null) => {
    const networkSuffix = network || getNetworkSuffix();
    return `${R2_PUBLIC_URL}/stacks/${networkSuffix}/pox-cycles/${poxCycleNumber}.json`;
};

/**
 * Get the public URL for STX balance snapshot by block height and poll ID
 * @param {string} pollId - The poll ID (contract deployer address)
 * @param {number} snapshotHeight - The snapshot block height
 * @param {string} network - Optional network override ('mainnet' or 'testnet')
 * @returns {string} - The public URL
 */
export const getStxBalanceSnapshotUrl = (pollId, snapshotHeight, network = null) => {
    const networkSuffix = network || getNetworkSuffix();
    return `${R2_PUBLIC_URL}/stacks/${networkSuffix}/polls/${pollId}/stx-balance-by-snapshot-${snapshotHeight}.json`;
};

/**
 * Get the public URL for STX dust voting snapshot by block height and poll ID
 * @param {string} pollId - The poll ID (contract deployer address)
 * @param {number} snapshotHeight - The snapshot block height
 * @param {string} network - Optional network override ('mainnet' or 'testnet')
 * @returns {string} - The public URL
 */
export const getStxDustVotingSnapshotUrl = (pollId, snapshotHeight, network = null) => {
    const networkSuffix = network || getNetworkSuffix();
    return `${R2_PUBLIC_URL}/stacks/${networkSuffix}/polls/${pollId}/stx-dust-voting-by-snapshot-${snapshotHeight}.json`;
};
