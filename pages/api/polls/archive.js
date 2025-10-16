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
 * API endpoint to archive poll in CloudFlare R2
 */
export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pollId } = req.body;

    // Validate required fields
    if (!pollId) {
      return res
        .status(400)
        .json({ error: "pollId is required" });
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

    // Update the poll with archive status and close it
    pollData.archived = true;
    pollData.status = "closed";
    pollData.updatedAt = new Date().toISOString();

    // Save updated poll data back to R2
    const putPollCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pollObjectKey,
      Body: Buffer.from(JSON.stringify(pollData), "utf8"),
      ContentType: "application/json",
    });

    await r2Client.send(putPollCommand);

    // // Now update the poll index
    // const getPollIndexCommand = new GetObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: pollIndexKey,
    // });

    // try {
    //   const pollIndexResponse = await r2Client.send(getPollIndexCommand);
    //   const pollIndexContent = await pollIndexResponse.Body.transformToString();
    //   const pollIndex = JSON.parse(pollIndexContent);

    //   // Update the poll in the index with archive status and closed status
    //   if (pollIndex.ref && pollIndex.ref[pollId]) {
    //     pollIndex.ref[pollId].archived = true;
    //     pollIndex.ref[pollId].status = "closed";
    //     pollIndex.ref[pollId].updatedAt = new Date().toISOString();

    //     // Save updated poll index back to R2
    //     const putPollIndexCommand = new PutObjectCommand({
    //       Bucket: BUCKET_NAME,
    //       Key: pollIndexKey,
    //       Body: Buffer.from(JSON.stringify(pollIndex), "utf8"),
    //       ContentType: "application/json",
    //     });

    //     await r2Client.send(putPollIndexCommand);
    //   }
    // } catch (error) {
    //   // Poll index might not exist, which is okay for individual poll updates
    //   console.warn("Poll index not found or failed to update:", error.message);
    // }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        pollId,
        archived: true,
        status: "closed",
        updatedAt: pollData.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error archiving poll:", error);
    return res.status(500).json({
      error: "Failed to archive poll",
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