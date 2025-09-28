// BASIC AUTH MIDDLEWARE
// This middleware checks for Basic Authentication credentials in the request headers.

import { Request, Response, NextFunction } from "express";

const VALID_USERNAME = process.env.AUTH_USERNAME?.toString().trim();
const VALID_PASSWORD = process.env.AUTH_PASSWORD?.toString().trim();

// console.log(`Using credentials: ${VALID_USERNAME}:${VALID_PASSWORD}`);

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

  // Parse credentials from header
  const [username, password] = authHeader.toString().trim().split(":");

  // Validate credentials - ensure both username and password exist and match
  if (
    username &&
    password &&
    username === VALID_USERNAME &&
    password === VALID_PASSWORD
  ) {
    next(); // Authorized
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
