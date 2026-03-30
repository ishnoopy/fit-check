import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3.js";

function isS3Key(value: string) {
  return value.startsWith("uploads/");
}

export async function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return value ?? null;
  }

  if (!isS3Key(value)) {
    return value;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: value,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
