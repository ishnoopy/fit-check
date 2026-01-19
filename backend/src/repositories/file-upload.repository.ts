import type { FilterQuery } from 'mongoose';
import FileUploadModel, { type IFileUpload } from '../models/file-upload.model.js';
import { toCamelCase, toSnakeCase } from '../utils/transformer.js';

/**
 * Find all file uploads
 */
export async function findAll() {
  const fileUploads = await FileUploadModel.find().lean();
  return toCamelCase(fileUploads) as IFileUpload[];
}

/**
 * Find file uploads by user ID
 */
export async function findByUserId(userId: string) {
  const fileUploads = await FileUploadModel.find({ user_id: userId }).lean();
  return toCamelCase(fileUploads) as IFileUpload[];
}

/**
 * Find a single file upload by query
 */
export async function findOne(where: FilterQuery<IFileUpload>) {
  const query = toSnakeCase(where);
  const fileUpload = await FileUploadModel.findOne(query).lean();
  return fileUpload ? toCamelCase(fileUpload) as IFileUpload : null;
}

/**
 * Create a new file upload record
 */
export async function createFileUpload(fileUpload: IFileUpload) {
  const payload = toSnakeCase(fileUpload);
  const doc = await FileUploadModel.create(payload);
  return toCamelCase(doc.toObject()) as IFileUpload;
}

/**
 * Update a file upload record by ID
 */
export async function updateFileUpload(id: string, fileUpload: Partial<IFileUpload>) {
  const payload = toSnakeCase(fileUpload);
  const doc = await FileUploadModel.findByIdAndUpdate(id, payload, { new: true, lean: true });
  return doc ? toCamelCase(doc) as IFileUpload : null;
}

/**
 * Delete a file upload record by ID
 */
export async function deleteFileUpload(id: string) {
  const doc = await FileUploadModel.findByIdAndDelete(id).lean();
  return doc ? toCamelCase(doc) as IFileUpload : null;
}

/**
 * Delete a file upload record by S3 key
 */
export async function deleteByS3Key(s3Key: string) {
  const doc = await FileUploadModel.findOneAndDelete({ s3_key: s3Key }).lean();
  return doc ? toCamelCase(doc) as IFileUpload : null;
}
