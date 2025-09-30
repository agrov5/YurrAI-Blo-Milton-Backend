import { Request, Response, NextFunction } from "express";
import http from "http"; // Built-in Node module for status messages
import fs from "fs";
import path from "path";

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusMessage = http.STATUS_CODES[statusCode] || "Unknown Status";

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | ` +
        `Status: ${statusCode} (${statusMessage}) | ` +
        `Time: ${duration}ms | IP: ${req.ip}`
    );
  });

  next();
};

/**
 * Saves an object as JSON file in the src/ directory
 * @param obj - Object to save as JSON
 * @param filename - Optional filename (without extension). If not provided, uses timestamp
 * @returns The full path of the saved file
 */
export const saveAsJson = (obj: any, filename?: string): string => {
  try {
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalFilename = filename
      ? `${filename}.json`
      : `object-${timestamp}.json`;

    // Get the src directory path (current file is in src/middlewares/)
    const srcDir = path.resolve(__dirname, "..");
    const filePath = path.join(srcDir, finalFilename);

    // Convert object to JSON string with pretty formatting
    const jsonString = JSON.stringify(obj, null, 2);

    // Write file synchronously
    fs.writeFileSync(filePath, jsonString, "utf8");

    console.log(`Object saved as JSON: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error saving object as JSON:", error);
    throw error;
  }
};

/**
 * Async version of saveObjectAsJson
 * @param obj - Object to save as JSON
 * @param filename - Optional filename (without extension). If not provided, uses timestamp
 * @returns Promise that resolves to the full path of the saved file
 */
export const saveAsJsonAsync = async (
  obj: any,
  filename?: string
): Promise<string> => {
  try {
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalFilename = filename
      ? `${filename}.json`
      : `object-${timestamp}.json`;

    // Get the src directory path (current file is in src/middlewares/)
    const srcDir = path.resolve(__dirname, "..");
    const filePath = path.join(srcDir, finalFilename);

    // Convert object to JSON string with pretty formatting
    const jsonString = JSON.stringify(obj, null, 2);

    // Write file asynchronously
    await fs.promises.writeFile(filePath, jsonString, "utf8");

    console.log(`Object saved as JSON: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error saving object as JSON:", error);
    throw error;
  }
};
