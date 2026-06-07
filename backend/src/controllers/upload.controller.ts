import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { config } from "../config.js";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";

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

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120) || "upload"
  );
}

function getUserUploadPrefix(userId: string) {
  return `uploads/${userId}/`;
}

async function getOwnedUploadByKey(userId: string, key: string) {
  const decodedKey = decodeURIComponent(key);

  if (!decodedKey.startsWith(getUserUploadPrefix(userId))) {
    throw new ForbiddenError("You do not have access to this file");
  }

  const upload = await fileUploadRepository.findOne({ s3Key: decodedKey });
  if (!upload?.id) {
    throw new NotFoundError("Uploaded file not found");
  }

  if (upload.userId !== userId) {
    throw new ForbiddenError("You do not have access to this file");
  }

  return upload;
}

function getPostMediaMaxBytes() {
  const fromEnv = Number(config.POST_MEDIA_MAX_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_POST_MEDIA_MAX_BYTES;
}

/**
 * Accept a multipart file upload, store it in MinIO, and record it in the database.
 */
export async function uploadFile(c: Context) {
  const userId = c.get("user").id;
  const maxFileSize = getPostMediaMaxBytes();

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    throw new BadRequestError("A file field is required");
  }

  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new BadRequestError("Invalid file type");
  }

  if (file.size > maxFileSize) {
    throw new BadRequestError("File size exceeds the allowed 5MB limit");
  }

  const safeFileName = sanitizeFileName(file.name);
  const key = `${getUserUploadPrefix(userId)}${crypto.randomUUID()}-${safeFileName}`;

  const arrayBuffer = await file.arrayBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
      ContentLength: file.size,
    }),
  );

  const fileUpload = await fileUploadRepository.createFileUpload({
    userId,
    s3Key: key,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });

  return c.json({ success: true, data: fileUpload }, StatusCodes.CREATED);
}

/**
 * Stream a file from MinIO by its S3 key. Public — no auth required.
 */
export async function serveMedia(c: Context) {
  const key = decodeURIComponent(c.req.path.replace("/api/media/", ""));

  if (!key.startsWith("uploads/") || key.includes("..")) {
    throw new NotFoundError("Media not found");
  }

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new NotFoundError("Media not found");
  }

  const stream = response.Body.transformToWebStream();

  return c.body(stream, StatusCodes.OK, {
    "Content-Type": response.ContentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    ...(response.ContentLength
      ? { "Content-Length": String(response.ContentLength) }
      : {}),
  });
}

/**
 * Delete a file from MinIO and remove its metadata from the database.
 */
export async function deleteFile(c: Context) {
  const userId = c.get("user").id;
  const key = c.req.param("key");

  if (!key) {
    throw new BadRequestError("Missing required parameter: key");
  }

  const upload = await getOwnedUploadByKey(userId, key);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: upload.s3Key,
    }),
  );

  await fileUploadRepository.deleteByS3Key(upload.s3Key);

  return c.json({ success: true, message: "File deleted successfully" }, StatusCodes.OK);
}
