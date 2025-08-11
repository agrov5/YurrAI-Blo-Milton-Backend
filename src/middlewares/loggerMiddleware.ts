import { Request, Response, NextFunction } from "express";
import http from "http"; // Built-in Node module for status messages

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
