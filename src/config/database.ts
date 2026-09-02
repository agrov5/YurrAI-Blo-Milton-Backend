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

export const clearDBForPopulate = async () => {
  try {
    for (const collection of ["employees", "rooms", "treatments"]) {
      try {
        await mongoose.connection.db.dropCollection(collection);
        console.log(`Dropped MongoDB collection: ${collection}`);
      } catch (error) {
        const mongoError = error as { codeName?: string; code?: number };
        if (
          mongoError.codeName !== "NamespaceNotFound" &&
          mongoError.code !== 26
        ) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Error clearing MongoDB database:", error);
  }
};