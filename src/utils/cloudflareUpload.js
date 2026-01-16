// utils/cloudflareUpload.js
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// ====================
// INIT R2 CLIENT
// ====================
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID_R}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ====================
// UPLOAD TO R2
// ====================
const uploadToCloudflare = async (fileBuffer, originalName, mimeType) => {
  try {
    if (!fileBuffer) {
      throw new Error("File buffer missing");
    }

    const extension =
      originalName?.split(".").pop()?.toLowerCase() || "jpg";

    const key = `restaurants/${uuidv4()}.${extension}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType || "image/jpeg",
        CacheControl: "public, max-age=31536000",
      })
    );

    return `${process.env.R2_PUBLIC_URL_R}/${key}`;
  } catch (error) {
    console.error("Cloudflare R2 upload error:", error);
    throw error;
  }
};

// ====================
// DELETE FROM R2
// ====================
const deleteFromCloudflare = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    const key = imageUrl.replace(
      `${process.env.R2_PUBLIC_URL_R}/`,
      ""
    );

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.warn("Cloudflare R2 delete failed:", error.message);
  }
};

module.exports = {
  uploadToCloudflare,
  deleteFromCloudflare,
};
