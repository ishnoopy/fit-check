import mongoose, { model } from "mongoose";

export interface IUser {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
}, {
  timestamps: true
});

export default model<IUser>("User", UserSchema);