import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

// 
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

/**
 * API endpoint to store files in CloudFlare R2 bucket
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, content } = req.body;

    // Validate required fields
    if (!fileName || content === undefined) {
      return res
        .status(400)
        .json({ error: "fileName and content are required" });
    }

    // Authenticate the request
    const keyData = await validateApiKey(req.headers.authorization);

    // Extract user information from the request
    const { gaiaAddress } = keyData;

    // Construct the R2 object key: {gaiaAddress}/{fileName}
    const objectKey = `${gaiaAddress}/${fileName}`;

    // Prepare content for upload
    let contentBuffer;
    if (typeof content === "string") {
      contentBuffer = Buffer.from(content, "utf8");
    } else {
      contentBuffer = Buffer.from(JSON.stringify(content), "utf8");
    }

    // Set content type based on file extension
    let contentType = "application/octet-stream";
    if (fileName.endsWith(".json")) {
      contentType = "application/json";
    } else if (fileName.endsWith(".txt")) {
      contentType = "text/plain";
    } else if (fileName.endsWith(".html")) {
      contentType = "text/html";
    }

    // Create the put command
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: contentBuffer,
      ContentType: contentType,
    });

    // Upload to R2
    await r2Client.send(putCommand);

    // Return success response
    return res.status(200).json({
      data: {
        key: objectKey,
        url: `https://storage.ballot.gg/${objectKey}`,
      },
    });
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return res.status(500).json({
      error: "Failed to upload file",
      message: error.message,
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Adjust based on your needs
    },
  },
};