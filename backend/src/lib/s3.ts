import { S3Client } from '@aws-sdk/client-s3'

console.log("✏️ ~ s3.ts:3 ~ process.env.AWS_REGION:", process.env.AWS_REGION)
export const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1"
})
