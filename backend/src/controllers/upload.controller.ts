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
});

const createFileUploadSchema = z.object({
  s3Key: z.string(),
  mimeType: z.string(),
  fileName: z.string(),
  fileSize: z.number().optional(),
});

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function generatePresignedUploadUrl(c: Context) {
  const { fileName, fileType } = await c.req.json();
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
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
  ];

  if (!ALLOWED_TYPES.includes(fileType)) {
    return c.json({ message: "Invalid file type" }, 400);
  }

  const key = `uploads/${crypto.randomUUID()}-${fileName}`;

  const presignedPost = await createPresignedPost(s3, {
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ["content-length-range", 0, MAX_FILE_SIZE],
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
