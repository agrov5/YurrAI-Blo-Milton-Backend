const mongoose = require("mongoose");
import { DatabaseReceptionistName } from "../models/Types";

require("dotenv").config();

export const connectDB = async () => {

  try {
    await mongoose.connect(process.env.DATABASE_URL, {});
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("MongoDB disconnection error:", error);
  }
};

export const clearDB = async () => {
  try {
    await mongoose.connection.db.dropDatabase();
    console.log("Cleared MongoDB database");
  } catch (error) {
    console.error("Error clearing MongoDB database:", error);
  }
};
