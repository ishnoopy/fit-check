import mongoose, { model } from "mongoose";

/**
 * Interface for the file upload object used in the application
 */
export interface IFileUpload {
  id?: string;
  userId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for the file upload model in the database
 */
export interface IFileUploadModel {
  _id?: string;
  user_id: string;
  s3_key: string;
  file_name: string;
  mime_type: string;
  file_size?: number;
  created_at?: Date;
  updated_at?: Date;
}

const FileUploadSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  s3_key: { type: String, required: true, unique: true },
  file_name: { type: String, required: true },
  mime_type: { type: String, required: true },
  file_size: { type: Number },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

export default model<IFileUploadModel>("FileUpload", FileUploadSchema);
