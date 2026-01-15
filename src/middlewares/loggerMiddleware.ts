import { Request, Response, NextFunction } from "express";
import http from "http"; // Built-in Node module for status messages
import fs from "fs";
import path from "path";
import axios from "axios";

// Axios request counter
let axiosRequestCounter = 0;

// Add request interceptor to log outgoing Axios requests with counter
axios.interceptors.request.use(
  (config) => {
    axiosRequestCounter++;
    console.log(
      `[Axios Request #${axiosRequestCounter}] ${config.method?.toUpperCase()} ${config.url}`
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

    // Build log message with request details
    let logMessage =
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | ` +
      `Status: ${statusCode} (${statusMessage}) | ` +
      `Time: ${duration}ms | IP: ${req.ip}`;

    // Add query parameters if present
    if (Object.keys(req.query).length > 0) {
      logMessage += ` | Query: ${JSON.stringify(req.query)}`;
    }

    // Add route parameters if present
    if (Object.keys(req.params).length > 0) {
      logMessage += ` | Params: ${JSON.stringify(req.params)}`;
    }

    // Add request body if present (limit size for readability)
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      const truncatedBody =
        bodyStr.length > 500 ? bodyStr.substring(0, 500) + "..." : bodyStr;
      logMessage += ` | Body: ${truncatedBody}`;
    }

    // Add content-type header if present
    if (req.headers["content-type"]) {
      logMessage += ` | Content-Type: ${req.headers["content-type"]}`;
    }

    // Add user-agent for tracking client info
    if (req.headers["user-agent"]) {
      logMessage += ` | User-Agent: ${req.headers["user-agent"]}`;
    }

    console.log(logMessage);
  });

  next();
};
