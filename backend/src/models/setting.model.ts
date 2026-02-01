import mongoose, { model } from "mongoose";

export interface ISetting {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  settings: {
    restDays?: number;
    timezone?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISettingModel {
  user_id: mongoose.Schema.Types.ObjectId | string;
  settings: {
    rest_days?: number;
    timezone?: string;
  };
  created_at?: Date;
  updated_at?: Date;
}

const SettingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    settings: {
      rest_days: { type: Number, required: false },
      timezone: { type: String, required: false },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export default model<ISettingModel>("Setting", SettingSchema);
