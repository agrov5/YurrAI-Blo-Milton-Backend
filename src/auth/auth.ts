import { log } from "console";
import { Request, Response, NextFunction } from "express";
require("dotenv").config();

const VALID_USERNAME = process.env.AUTH_USERNAME?.toString();
const VALID_PASSWORD = process.env.AUTH_PASSWORD?.toString();

// Middleware for Basic Auth
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any | void> => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  // Decode base64 credentials
  const [username, password] = authHeader.toString().split(":");

  // Validate credentials
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    next(); // Authorized
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
