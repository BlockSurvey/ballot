import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { validateApiKey } from '../../auth/middleware';
import { Constants } from '../../../../common/constants';

// Configure CloudFlare R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

/**
 * Get network suffix based on STACKS_MAINNET_FLAG
 */
const getNetworkSuffix = () => {
  return Constants.STACKS_MAINNET_FLAG ? 'mainnet' : 'testnet';
};

/**
 * Generate the R2 key path for STX dust voting snapshot
 */
const getStxDustVotingSnapshotKey = (pollId, snapshotHeight) => {
  const networkSuffix = getNetworkSuffix();
  return `stacks/${networkSuffix}/polls/${pollId}/stx-dust-voting-by-snapshot-${snapshotHeight}.json`;
};

/**
 * API endpoint for STX dust voting snapshots
 * GET: Retrieve existing snapshot (no auth required) - pollId in URL, snapshotHeight in query
 * POST: Create new snapshot (auth required) - pollId in URL, snapshotHeight and balances in body
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          allowedMethods: ['GET', 'POST']
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Handle GET requests - retrieve existing STX dust voting snapshot (no auth required)
 * Expected query params: ?snapshotHeight=12345
 */
async function handleGet(req, res) {
  const { pollId } = req.query;
  const { snapshotHeight } = req.query;

  // Validate required parameters
  if (!pollId) {
    return res.status(400).json({
      error: 'Missing poll ID',
      message: 'Poll ID must be provided in the URL path'
    });
  }

  if (!snapshotHeight || isNaN(snapshotHeight)) {
    return res.status(400).json({
      error: 'Invalid snapshot height parameter',
      message: 'Snapshot height must be a valid number provided in query params: ?snapshotHeight=12345'
    });
  }

  const snapshotHeightNum = parseInt(snapshotHeight);

  try {
    const key = getStxDustVotingSnapshotKey(pollId, snapshotHeightNum);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    const bodyString = await response.Body.transformToString();
    const snapshotData = JSON.parse(bodyString);

    return res.status(200).json({
      success: true,
      pollId: pollId,
      snapshotHeight: snapshotHeightNum,
      network: getNetworkSuffix(),
      data: snapshotData,
      url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://storage.ballot.gg'}/${key}`
    });

  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'STX dust voting snapshot not found',
        pollId: pollId,
        snapshotHeight: snapshotHeightNum,
        network: getNetworkSuffix(),
        exists: false
      });
    }

    console.error('Error retrieving STX dust voting snapshot:', error);
    return res.status(500).json({
      error: 'Failed to retrieve STX dust voting snapshot',
      message: error.message
    });
  }
}

/**
 * Handle POST requests - create new STX dust voting snapshot (auth required)
 * Expected body: { snapshotHeight, walletBalances }
 */
async function handlePost(req, res) {
  try {
    // Authenticate the request
    const keyData = await validateApiKey(req.headers.authorization);
    const { gaiaAddress } = keyData;

    const { pollId } = req.query;
    const { snapshotHeight, walletBalances } = req.body;

    // Validate required fields
    if (!pollId) {
      return res.status(400).json({
        error: 'Missing poll ID',
        message: 'Poll ID must be provided in the URL path'
      });
    }

    if (!snapshotHeight || !walletBalances) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['snapshotHeight', 'walletBalances']
      });
    }

    // Validate snapshotHeight format
    if (isNaN(snapshotHeight)) {
      return res.status(400).json({
        error: 'Invalid snapshot height format',
        message: 'Snapshot height must be a valid number'
      });
    }

    // If snapshotHeight is not a number, return an error
    const snapshotHeightNum = parseInt(snapshotHeight);

    // Validate walletBalances structure
    if (!isValidBalancesStructure(walletBalances)) {
      return res.status(400).json({
        error: 'Invalid wallet balances structure',
        message: 'Wallet balances must be a valid object with address to balance mappings'
      });
    }

    // Check if snapshot already exists and merge with new data
    const key = getStxDustVotingSnapshotKey(pollId, snapshotHeightNum);
    let existingBalances = {};
    let existingData = null;
    let isUpdate = false;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await r2Client.send(getCommand);
      const bodyString = await response.Body.transformToString();
      existingData = JSON.parse(bodyString);

      // Extract existing wallet balances
      if (existingData && existingData.walletBalances) {
        existingBalances = existingData.walletBalances;
        isUpdate = true;
        console.log(`Merging with existing dust voting snapshot containing ${Object.keys(existingBalances).length} addresses`);
      }
    } catch (error) {
      // File doesn't exist, which is fine - we'll create a new one
      if (error.name !== 'NoSuchKey' && error.$metadata?.httpStatusCode !== 404) {
        throw error;
      }
    }

    // Merge new wallet balances with existing ones
    const mergedBalances = { ...existingBalances, ...walletBalances };
    const newAddressesCount = Object.keys(walletBalances).length;
    const totalAddressesCount = Object.keys(mergedBalances).length;

    // Create snapshot data structure
    const snapshotData = {
      pollId: pollId,
      snapshotHeight: snapshotHeightNum,
      network: getNetworkSuffix(),
      createdAt: isUpdate ? (existingData?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: gaiaAddress,
      totalWallets: totalAddressesCount,
      walletBalances: mergedBalances,
      metadata: {
        version: '1.0',
        source: 'ballot.gg-api',
        votingType: 'stx-dust-voting',
        stacksMainnetFlag: Constants.STACKS_MAINNET_FLAG,
        isUpdate: isUpdate,
        newAddressesInThisUpdate: newAddressesCount
      }
    };

    // Store to R2
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: Buffer.from(JSON.stringify(snapshotData, null, 2), 'utf8'),
      ContentType: 'application/json',
      Metadata: {
        'poll-id': pollId,
        'snapshot-height': snapshotHeightNum.toString(),
        'voting-type': 'stx-dust-voting',
        'network': getNetworkSuffix(),
        'updated-at': new Date().toISOString(),
        'created-by': gaiaAddress
      }
    });

    await r2Client.send(putCommand);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      pollId: pollId,
      snapshotHeight: snapshotHeightNum,
      network: getNetworkSuffix(),
      stored: true,
      isUpdate: isUpdate,
      url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://storage.ballot.gg'}/${key}`,
      newAddresses: newAddressesCount,
      totalWallets: totalAddressesCount,
      previousTotal: Object.keys(existingBalances).length,
      createdBy: gaiaAddress
    });

  } catch (error) {
    if (error.message === 'Invalid API key') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid API key'
      });
    }

    console.error('Error creating STX dust voting snapshot:', error);
    return res.status(500).json({
      error: 'Failed to create STX dust voting snapshot',
      message: error.message
    });
  }
}

/**
 * Validate the structure of the wallet balances object
 * @param {Object} balances - The balances object to validate
 * @returns {boolean} - True if valid structure
 */
function isValidBalancesStructure(balances) {
  if (!balances || typeof balances !== 'object' || Array.isArray(balances)) {
    return false;
  }

  try {
    for (const [address, balanceData] of Object.entries(balances)) {
      // Validate address format (basic check)
      if (!address || typeof address !== 'string') {
        return false;
      }

      // Validate balance data structure
      if (!balanceData || typeof balanceData !== 'object') {
        return false;
      }

      // Validate required balance fields
      const { locked, unlocked, total } = balanceData;
      if (typeof locked !== 'number' || typeof unlocked !== 'number' || typeof total !== 'number') {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger payloads for balance data
    },
  },
};
