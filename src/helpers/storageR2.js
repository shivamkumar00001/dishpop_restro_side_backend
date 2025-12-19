const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// Cloudflare R2 S3-Compatible Client with timeout configuration
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  // ✅ ADD TIMEOUT CONFIGURATION
  requestHandler: {
    requestTimeout: 20000, // 20 seconds timeout
    connectionTimeout: 10000, // 10 seconds connection timeout
  },
  maxAttempts: 2, // Reduce retry attempts from 3 to 2
});

console.log("R2 Configuration:", {
  key: process.env.R2_ACCESS_KEY ? "✅ LOADED" : "❌ MISSING",
  secret: process.env.R2_SECRET_KEY ? "✅ LOADED" : "❌ MISSING",
  bucket: process.env.R2_BUCKET || "❌ MISSING",
  account: process.env.R2_ACCOUNT_ID || "❌ MISSING",
  publicURL: process.env.R2_PUBLIC_URL || "❌ MISSING",
});

/**
 * Upload buffer to R2 and return public URL
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} bucket - R2 bucket name
 * @param {string} key - Object key (path) in R2
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} Public URL of uploaded file
 */
async function uploadBuffer(buffer, bucket, key, contentType) {
  try {
    console.log(`📤 Starting R2 upload: ${key}`);
    console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Type: ${contentType}`);
    console.log(`   Bucket: ${bucket}`);

    const startTime = Date.now();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // ✅ ADD METADATA FOR DEBUGGING
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await r2.send(command);

    const uploadTime = Date.now() - startTime;
    console.log(`✅ Upload successful in ${uploadTime}ms`);

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`🔗 Public URL: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("❌ R2 Upload Error:", {
      message: error.message,
      code: error.code,
      name: error.name,
      key: key,
    });

    // Provide more specific error messages
    if (error.code === "ECONNRESET" || error.name === "TimeoutError") {
      throw new Error(
        "Upload timeout - file may be too large or connection is slow"
      );
    } else if (error.code === "NoSuchBucket") {
      throw new Error(`R2 Bucket '${bucket}' does not exist`);
    } else if (error.code === "InvalidAccessKeyId") {
      throw new Error("Invalid R2 access credentials");
    } else if (error.code === "SignatureDoesNotMatch") {
      throw new Error("R2 secret key is incorrect");
    }

    throw error;
  }
}

/**
 * Delete object from R2
 * @param {string} bucket - R2 bucket name
 * @param {string} key - Object key (path) in R2
 */
async function deleteFromR2(bucket, key) {
  try {
    console.log(`🗑️ Deleting from R2: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await r2.send(command);

    console.log(`✅ Deleted successfully: ${key}`);
  } catch (error) {
    console.error("❌ R2 Delete Error:", {
      message: error.message,
      code: error.code,
      key: key,
    });

    // Don't throw error on delete failures - log and continue
    console.log("⚠️ Continuing despite delete failure...");
  }
}

module.exports = {
  uploadBuffer,
  deleteFromR2,
};