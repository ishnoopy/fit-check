import mongoose, { model } from "mongoose";

/** Individual message within a conversation */
export interface IMessage {
  role: "user" | "coach";
  content: string;
  intent?: string;
  createdAt?: Date;
}

/** Conversation document (camelCase for app layer) */
export interface IConversation {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  title: string;
  summary?: string;
  messages: IMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** Individual message within a conversation (snake_case for DB layer) */
export interface IMessageModel {
  role: "user" | "coach";
  content: string;
  intent?: string;
  created_at?: Date;
}

/** Conversation document (snake_case for DB layer) */
export interface IConversationModel {
  _id?: string;
  user_id: mongoose.Schema.Types.ObjectId | string;
  title: string;
  summary?: string;
  messages: IMessageModel[];
  created_at?: Date;
  updated_at?: Date;
}

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "coach"],
      required: true,
    },
    content: { type: String, required: true },
    intent: { type: String, required: false },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ConversationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    summary: { type: String, required: false },
    messages: { type: [MessageSchema], default: [] },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

ConversationSchema.index({ user_id: 1, updated_at: -1 });

export default model<IConversationModel>("Conversation", ConversationSchema);
