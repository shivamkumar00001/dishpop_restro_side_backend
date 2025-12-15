// helpers/storageR2.js
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// Cloudflare R2 S3-Compatible Client
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

console.log("R2 DEBUG:", {
  key: process.env.R2_ACCESS_KEY ? "LOADED" : "MISSING",
  secret: process.env.R2_SECRET_KEY ? "LOADED" : "MISSING",
  bucket: process.env.R2_BUCKET,
  account: process.env.R2_ACCOUNT_ID,
  publicURL: process.env.R2_PUBLIC_URL,
});

/**
 * Upload buffer to R2 and return public URL
 */
async function uploadBuffer(buffer, bucket, key, contentType) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Cloudflare R2 public URL (from bucket settings)
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete object from R2
 */
async function deleteFromR2(bucket, key) {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    console.log("🔥 Deleted from R2:", key);
  } catch (err) {
    console.error("❌ Failed deleting from R2:", err);
  }
}

module.exports = {
  uploadBuffer,
  deleteFromR2,
};
