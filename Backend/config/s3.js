const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');

// Load env vars if not already loaded
if (!process.env.S3_ENDPOINT_URL) {
  dotenv.config();
}

// Check for required environment variables
const requiredEnv = [
  'S3_ENDPOINT_URL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'S3_REGION'
];

let missingEnv = false;
requiredEnv.forEach(v => {
  if (!process.env[v]) {
    console.error(`❌ Missing required environment variable for S3 storage: ${v}`);
    missingEnv = true;
  }
});

if (missingEnv) {
  console.error("🚨 Please add the required S3 variables to your .env file.");
  // We don't exit the process here to allow the app to run in modes that don't require S3.
  // The check should be performed where the client is used.
}

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT_URL,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Important for many S3-compatible services
});

module.exports = { s3Client };
