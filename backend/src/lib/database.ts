import mongoose from "mongoose";
import { config } from "../config.js";

mongoose.set("sanitizeFilter", true);

async function connect() {
  try {
    await mongoose.connect(config.DB_URL, {
      serverSelectionTimeoutMS: 30000, // 30s timeout
    });
    console.log("Database connected");
  } catch (error) {
    console.error(error);
    console.log("Database connection failed");
  }
}

export default connect;
