import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { s3 } from "../lib/s3.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";

export async function deleteGalleryImageService(imageId: string, userId: string) {
  const fileUpload = await fileUploadRepository.findOne({ id: imageId });

  if (fileUpload?.userId !== userId) {
    throw new BadRequestError("Unauthorized access to image");
  }

  if (!fileUpload) {
    throw new NotFoundError("Image not found");
  }

  // delete image from database
  await fileUploadRepository.deleteFileUpload(imageId);

  // delete image from s3
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileUpload?.s3Key,
  });

  await s3.send(command);

  return true;
}
