import mongoose, { model } from "mongoose";

export interface IPost {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  mediaUploadId?: mongoose.Schema.Types.ObjectId | string;
  mediaKind?: "image" | "gif" | "video";
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPostModel {
  _id?: string;
  user_id: mongoose.Schema.Types.ObjectId | string;
  media_upload_id?: mongoose.Schema.Types.ObjectId | string;
  media_kind?: "image" | "gif" | "video";
  text: string;
  created_at?: Date;
  updated_at?: Date;
}

const PostSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media_upload_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileUpload",
      required: false,
    },
    media_kind: {
      type: String,
      enum: ["image", "gif", "video"],
      required: false,
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

PostSchema.index({ created_at: -1 });
PostSchema.index({ user_id: 1, created_at: -1 });

export default model<IPostModel>("Post", PostSchema);
