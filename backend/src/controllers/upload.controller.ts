import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";

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
  const body = await c.req.json();
  const validation = await presignSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const { fileName, fileType } = validation.data;
  const key = `uploads/${crypto.randomUUID()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 60,
  });

  return c.json(
    {
      success: true,
      data: {
        uploadUrl,
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
