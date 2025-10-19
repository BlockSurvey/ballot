import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { validateApiKey } from '../../auth/middleware';
import { validatePoxCycle } from '../../../../services/pox-validation';
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
 * Generate the R2 key path for a PoX cycle
 */
const getPoxCycleKey = (poxCycle) => {
  const networkSuffix = getNetworkSuffix();
  return `stacks/${networkSuffix}/pox-cycles/${poxCycle}.json`;
};

/**
 * API endpoint for PoX cycle mappings
 * GET: Retrieve existing mapping (no auth required) - poxCycle in query params
 * POST: Create new mapping (auth required + validation) - poxCycle in body
 * PUT: Update existing mapping (auth required + validation) - poxCycle in body
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
      case 'PUT':
        return await handlePut(req, res);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          allowedMethods: ['GET', 'POST', 'PUT']
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
 * Handle GET requests - retrieve existing PoxCycle mapping (no auth required)
 * PoX cycle number expected in query params: ?poxCycle=120
 */
async function handleGet(req, res) {
  const { poxCycle } = req.query;

  // Validate poxCycle parameter
  if (!poxCycle || isNaN(poxCycle)) {
    return res.status(400).json({
      error: 'Invalid PoX cycle parameter',
      message: 'PoX cycle must be a valid number provided in query params: ?poxCycle=120'
    });
  }

  const poxCycleNum = parseInt(poxCycle);

  try {
    const key = getPoxCycleKey(poxCycleNum);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    const bodyString = await response.Body.transformToString();
    const mappingData = JSON.parse(bodyString);

    return res.status(200).json({
      success: true,
      poxCycle: poxCycleNum,
      network: getNetworkSuffix(),
      data: mappingData,
      url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://storage.ballot.gg'}/${key}`
    });

  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'PoX cycle mapping not found',
        poxCycle: poxCycleNum,
        network: getNetworkSuffix(),
        exists: false
      });
    }

    console.error('Error retrieving PoX cycle mapping:', error);
    return res.status(500).json({
      error: 'Failed to retrieve PoX cycle mapping',
      message: error.message
    });
  }
}

/**
 * Handle POST requests - create new PoxCycle mapping (auth + validation required)
 * PoX cycle number expected in request body along with mapping data
 */
async function handlePost(req, res) {
  try {
    // Authenticate the request
    const keyData = await validateApiKey(req.headers.authorization);
    const { gaiaAddress } = keyData;

    const { poxCycle, mapping } = req.body;

    // Validate required fields
    if (!poxCycle || !mapping) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['poxCycle', 'mapping']
      });
    }

    // Validate poxCycle format
    if (isNaN(poxCycle)) {
      return res.status(400).json({
        error: 'Invalid PoX cycle format',
        message: 'PoX cycle must be a valid number'
      });
    }

    const poxCycleNum = parseInt(poxCycle);

    // Validate the PoX cycle exists (only for POST)
    const validation = await validatePoxCycle(poxCycleNum);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid PoX cycle',
        details: validation.error,
        poxCycle: poxCycleNum
      });
    }

    // Check if mapping already exists
    const key = getPoxCycleKey(poxCycleNum);
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      await r2Client.send(headCommand);
      
      // File exists
      return res.status(409).json({
        error: 'PoX cycle mapping already exists',
        poxCycle: poxCycleNum,
        network: getNetworkSuffix(),
        message: 'Use PUT method to update existing mapping'
      });
    } catch (error) {
      // File doesn't exist, which is what we want for POST
      if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) {
        throw error;
      }
    }

    // Validate mapping structure
    if (!isValidMappingStructure(mapping)) {
      return res.status(400).json({
        error: 'Invalid mapping structure',
        message: 'Mapping must be a valid object with BTC to STX address mappings'
      });
    }

    // Create enhanced mapping with metadata
    const enhancedMapping = {
      poxCycle: poxCycleNum,
      network: getNetworkSuffix(),
      createdAt: new Date().toISOString(),
      createdBy: gaiaAddress,
      totalSigners: validation.totalSigners,
      mapping: mapping,
      metadata: {
        version: '1.0',
        source: 'ballot.gg-api',
        validated: true,
        stacksMainnetFlag: Constants.STACKS_MAINNET_FLAG
      }
    };

    // Store to R2
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: Buffer.from(JSON.stringify(enhancedMapping, null, 2), 'utf8'),
      ContentType: 'application/json',
      Metadata: {
        'pox-cycle': poxCycleNum.toString(),
        'network': getNetworkSuffix(),
        'created-at': new Date().toISOString(),
        'created-by': gaiaAddress
      }
    });

    await r2Client.send(putCommand);

    return res.status(201).json({
      success: true,
      poxCycle: poxCycleNum,
      network: getNetworkSuffix(),
      stored: true,
      url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://storage.ballot.gg'}/${key}`,
      mappingSize: Object.keys(mapping).length,
      createdBy: gaiaAddress
    });

  } catch (error) {
    if (error.message === 'Invalid API key') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid API key'
      });
    }

    console.error('Error creating PoX cycle mapping:', error);
    return res.status(500).json({
      error: 'Failed to create PoX cycle mapping',
      message: error.message
    });
  }
}

/**
 * Validate the structure of the mapping object
 * @param {Object} mapping - The mapping object to validate
 * @returns {boolean} - True if valid structure
 */
function isValidMappingStructure(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    return false;
  }

  try {
    for (const [btcAddress, stxAddresses] of Object.entries(mapping)) {
      // Validate BTC address format (basic check)
      if (!btcAddress || typeof btcAddress !== 'string') {
        return false;
      }

      // Validate STX addresses array
      if (!Array.isArray(stxAddresses)) {
        return false;
      }

      // Validate each STX address
      for (const stxAddress of stxAddresses) {
        if (!stxAddress || typeof stxAddress !== 'string') {
          return false;
        }
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
      sizeLimit: '10mb', // Allow larger payloads for mapping data
    },
  },
};