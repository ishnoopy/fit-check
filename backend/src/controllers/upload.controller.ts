import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import { BadRequestError } from "../utils/errors.js";

const presignSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().positive().optional(),
});

const createFileUploadSchema = z.object({
  s3Key: z.string(),
  mimeType: z.string(),
  fileName: z.string(),
  fileSize: z.number().positive().optional(),
});

const DEFAULT_POST_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/heic",
  "image/heif",
  "image/heics",
  "image/heifs",
  "image/tiff",
  "image/x-tiff",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

function getPostMediaMaxBytes() {
  const fromEnv = Number(process.env.POST_MEDIA_MAX_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_POST_MEDIA_MAX_BYTES;
}

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function generatePresignedUploadUrl(c: Context) {
  const body = await c.req.json();
  const validation = await presignSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const { fileName, fileType, fileSize } = validation.data;
  const maxFileSize = getPostMediaMaxBytes();

  if (!ALLOWED_UPLOAD_TYPES.includes(fileType)) {
    return c.json({ message: "Invalid file type" }, 400);
  }

  if (fileSize && fileSize > maxFileSize) {
    return c.json({ message: "File size exceeds the allowed 5MB limit" }, 400);
  }

  const key = `uploads/${crypto.randomUUID()}-${fileName}`;

  const presignedPost = await createPresignedPost(s3, {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ["content-length-range", 0, maxFileSize],
      ["eq", "$Content-Type", fileType],
    ],
    Fields: {
      "Content-Type": fileType,
    },
    Expires: 60,
  });

  return c.json(
    {
      success: true,
      data: {
        url: presignedPost.url,
        fields: presignedPost.fields,
        key,
      },
    },
    StatusCodes.OK,
  );
}

/**
 * Generate a presigned URL for downloading a file from S3
 */
export async function generatePresignedDownloadUrl(c: Context) {
  const key = c.req.param("key");

  if (!key) {
    throw new BadRequestError("Missing required parameter: key");
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(s3, command, {
    expiresIn: 60,
  });

  return c.json(
    {
      success: true,
      data: {
        downloadUrl,
      },
    },
    StatusCodes.OK,
  );
}

/**
 * Delete a file from S3 and remove its metadata from the database
 */
export async function deleteFile(c: Context) {
  const key = c.req.param("key");

  if (!key) {
    throw new BadRequestError("Missing required parameter: key");
  }

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  await s3.send(command);
  await fileUploadRepository.deleteByS3Key(key);

  return c.json(
    {
      success: true,
      message: "File deleted successfully",
    },
    StatusCodes.OK,
  );
}

/**
 * Create a file upload record in the database after a successful S3 upload
 */
export async function createFileUpload(c: Context) {
  const body = await c.req.json();
  const validation = await createFileUploadSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const { s3Key, mimeType, fileName, fileSize } = validation.data;
  const maxFileSize = getPostMediaMaxBytes();

  if (!ALLOWED_UPLOAD_TYPES.includes(mimeType)) {
    throw new BadRequestError("Invalid file type");
  }

  if (fileSize && fileSize > maxFileSize) {
    throw new BadRequestError("File size exceeds the allowed 5MB limit");
  }

  const fileUpload = await fileUploadRepository.createFileUpload({
    userId,
    s3Key,
    fileName,
    mimeType,
    fileSize,
  });

  return c.json(
    {
      success: true,
      data: fileUpload,
    },
    StatusCodes.CREATED,
  );
}
