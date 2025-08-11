import { Request, Response, NextFunction } from "express";

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Wait until response is finished to log status and duration
  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms | IP: ${req.ip}`
    );
  });

  next();
};
