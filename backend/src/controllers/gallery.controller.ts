import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../lib/errors.js";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";

/**
 * Get all gallery images for the authenticated user
 */
export async function getGalleryImages(c: Context) {
  const userId = c.get("user").id;

  const fileUploads = await fileUploadRepository.findByUserId(userId);

  const imagesWithUrls = await Promise.all(
    fileUploads
      .filter((upload) => upload.mimeType.startsWith("image/"))
      .map(async (upload) => {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: upload.s3Key,
        });

        const downloadUrl = await getSignedUrl(s3, command, {
          expiresIn: 3600,
        });

        return {
          id: upload.id,
          url: downloadUrl,
          caption: upload.fileName,
          createdAt: upload.createdAt,
        };
      })
  );

  return c.json(
    {
      success: true,
      data: imagesWithUrls,
    },
    StatusCodes.OK,
  );
}

/**
 * Delete a gallery image by ID
 */
export async function deleteGalleryImage(c: Context) {
  const imageId = c.req.param("id");
  const userId = c.get("user").id;

  if (!imageId) {
    throw new NotFoundError("Image ID is required");
  }

  const fileUpload = await fileUploadRepository.findOne({ id: imageId });

  if (!fileUpload) {
    throw new NotFoundError("Image not found");
  }

  if (fileUpload.userId !== userId) {
    throw new NotFoundError("Image not found");
  }

  await fileUploadRepository.deleteFileUpload(imageId);

  return c.json(
    {
      success: true,
      message: "Image deleted successfully",
    },
    StatusCodes.OK,
  );
}
