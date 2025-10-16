import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { validateApiKey } from "../auth/middleware";

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
 * API endpoint to update poll description in CloudFlare R2
 */
export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pollId, description } = req.body;

    // Validate required fields
    if (!pollId || description === undefined) {
      return res
        .status(400)
        .json({ error: "pollId and description are required" });
    }

    // Authenticate the request
    const keyData = await validateApiKey(req.headers.authorization);

    // Extract user information from the request
    const { gaiaAddress } = keyData;

    // Construct the R2 object keys
    const pollObjectKey = `${gaiaAddress}/${pollId}.json`;
    const pollIndexKey = `${gaiaAddress}/pollIndex.json`;

    // First, get the existing poll data
    const getPollCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pollObjectKey,
    });

    let pollData;
    try {
      const pollResponse = await r2Client.send(getPollCommand);
      const pollContent = await pollResponse.Body.transformToString();
      pollData = JSON.parse(pollContent);
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return res.status(404).json({ error: "Poll not found" });
      }
      throw error;
    }

    // Update the poll description
    pollData.description = description;
    pollData.updatedAt = new Date().toISOString();

    // Save updated poll data back to R2
    const putPollCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pollObjectKey,
      Body: Buffer.from(JSON.stringify(pollData), "utf8"),
      ContentType: "application/json",
    });

    await r2Client.send(putPollCommand);

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        pollId,
        description,
        updatedAt: pollData.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating poll description:", error);
    return res.status(500).json({
      error: "Failed to update poll description",
      message: error.message,
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};