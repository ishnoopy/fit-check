import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

//DOCS: Load environment variables based on the environment
process.env.NODE_ENV !== "production"
	? dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
	: dotenv.config();

const DB_URL = process.env.DB_URL || "";

async function connect() {
	try {
		await mongoose.connect(DB_URL, {
			serverSelectionTimeoutMS: 30000, // 30s timeout
		});
		console.log("Database connected");
	} catch (error) {
		console.log("DB_URL", DB_URL);
		console.error(error);
		console.log("Database connection failed");
	}
}

export default connect;
