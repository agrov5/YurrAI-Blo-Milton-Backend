const mongoose = require("mongoose");

const url = process.env.DATABASE_URL || "mongodb://localhost:27017/test";

export const connectDB = async () => {
  try {
    await mongoose.connect(url, {});
    console.log(`Connected to MongoDB at (${url})`);
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
