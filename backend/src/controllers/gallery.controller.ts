import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import * as galleryService from "../services/gallery.service.js";
import { BadRequestError } from "../utils/errors.js";

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
      }),
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
 * Get all gallery images for a user by username
 */
export async function getGalleryImagesByUsername(c: Context) {
  const paramsSchema = z.object({
    username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/),
  });
  const params = await paramsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const username = params.data.username.toLowerCase();
  const user = await userRepository.findOne({ username });

  if (!user?.id) {
    return c.json(
      {
        success: true,
        data: [],
      },
      StatusCodes.OK,
    );
  }

  const fileUploads = await fileUploadRepository.findByUserId(user.id);

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
      }),
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

  if (!imageId) {
    throw new BadRequestError("Image ID is required");
  }

  const userId = c.get("user").id;
  await galleryService.deleteGalleryImageService(imageId, userId);

  return c.json(
    {
      success: true,
      message: "Image deleted successfully",
    },
    StatusCodes.OK,
  );
}
