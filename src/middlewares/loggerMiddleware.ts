import { Request, Response, NextFunction } from "express";
import http from "http";
import axios from "axios";
import { RequestLogModel } from "../models/RequestLog";

// ── Log entry types ──────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error";
export type LogType = "http" | "axios" | "app";

export interface LogEntry {
  id: string;
  type: LogType;
  level: LogLevel;
  timestamp: string;
  env: string;
  method?: string;
  url?: string;
  status?: number;
  statusMessage?: string;
  responseTimeMs?: number;
  ip?: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  reqBody?: unknown;
  resBody?: string;
  contentType?: string;
  userAgent?: string;
  // Axios-specific
  axiosRequestNumber?: number;
  axiosBaseURL?: string;
  axiosHeaders?: Record<string, unknown>;
  // App-level
  message?: string;
  meta?: unknown;
}

// ── In-memory circular log store ─────────────────────────────────────────────

const MAX_ENTRIES = 500;
const logStore: LogEntry[] = [];

function pushLog(entry: LogEntry): void {
  logStore.unshift(entry);
  if (logStore.length > MAX_ENTRIES) logStore.pop();
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toDbEntry(
  entry: LogEntry,
): Pick<
  LogEntry,
  | "id"
  | "type"
  | "level"
  | "timestamp"
  | "env"
  | "method"
  | "url"
  | "status"
  | "statusMessage"
  | "responseTimeMs"
  | "ip"
  | "query"
  | "params"
  | "resBody"
  | "message"
  | "meta"
> {
  return {
    id: entry.id,
    type: entry.type,
    level: entry.level,
    timestamp: entry.timestamp,
    env: entry.env,
    method: entry.method,
    url: entry.url,
    status: entry.status,
    statusMessage: entry.statusMessage,
    responseTimeMs: entry.responseTimeMs,
    ip: entry.ip,
    query: entry.query,
    params: entry.params,
    resBody: entry.resBody?.slice(0, 300),
    message: entry.message,
    meta: entry.meta,
  };
}

async function saveLogToMongo(entry: LogEntry): Promise<void> {
  try {
    await RequestLogModel.create(toDbEntry(entry));
  } catch (error) {
    console.error("Failed to save request log to MongoDB:", error);
  }
}

export const getLogs = (): LogEntry[] => [...logStore];
export const clearLogs = (): void => {
  logStore.length = 0;
};

// ── App-level logger (use anywhere in your codebase) ─────────────────────────

const currentEnv = process.env.NODE_ENV || "development";

export const appLogger = {
  info: (message: string, meta?: unknown) =>
    pushLog({
      id: makeId(),
      type: "app",
      level: "info",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      message,
      meta,
    }),
  warn: (message: string, meta?: unknown) =>
    pushLog({
      id: makeId(),
      type: "app",
      level: "warn",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      message,
      meta,
    }),
  error: (message: string, meta?: unknown) =>
    pushLog({
      id: makeId(),
      type: "app",
      level: "error",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      message,
      meta,
    }),
};

// ── Redact sensitive fields from request bodies ───────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "apiKey",
  "api_key",
  "access_token",
  "accessToken",
  "username",
]);

function redactBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...body };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) sanitized[key] = "[REDACTED]";
  }
  return sanitized;
}

// ── Axios interceptors ────────────────────────────────────────────────────────

let axiosRequestCounter = 0;

axios.interceptors.request.use(
  (config) => {
    axiosRequestCounter++;
    const entry: LogEntry = {
      id: makeId(),
      type: "axios",
      level: "info",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      method: config.method?.toUpperCase(),
      url: config.url,
      axiosRequestNumber: axiosRequestCounter,
      axiosBaseURL: config.baseURL,
      axiosHeaders: config.headers as Record<string, unknown>,
      reqBody: config.data,
    };
    pushLog(entry);
    console.log(
      `[Axios Request #${axiosRequestCounter}] ${config.method?.toUpperCase()} ${config.url}`,
    );
    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (response) => {
    const entry: LogEntry = {
      id: makeId(),
      type: "axios",
      level: response.status >= 400 ? "warn" : "info",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusMessage: response.statusText,
      resBody: JSON.stringify(response.data)?.slice(0, 2000),
    };
    pushLog(entry);
    saveLogToMongo(entry);
    return response;
  },
  (error) => {
    const entry: LogEntry = {
      id: makeId(),
      type: "axios",
      level: "error",
      timestamp: new Date().toISOString(),
      env: currentEnv,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusMessage: error.message,
      resBody: JSON.stringify(error.response?.data)?.slice(0, 2000),
    };
    pushLog(entry);
    saveLogToMongo(entry);
    return Promise.reject(error);
  },
);

// ── Response body capture (call before loggerMiddleware) ──────────────────────

export const captureResponseBody = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    res.locals.capturedBody =
      typeof body === "string"
        ? body.slice(0, 2000)
        : JSON.stringify(body)?.slice(0, 2000);
    return originalJson(body);
  };
  next();
};

// ── HTTP logger middleware ────────────────────────────────────────────────────

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on("finish", () => {
    if (req.path === "/") return;

    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusMessage = http.STATUS_CODES[statusCode] ?? "Unknown Status";

    // Determine level
    const level: LogLevel =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    // Sanitize body
    const rawBody = req.body as Record<string, unknown> | undefined;
    const safeBody =
      rawBody && Object.keys(rawBody).length > 0
        ? redactBody(rawBody)
        : undefined;

    const entry: LogEntry = {
      id: makeId(),
      type: "http",
      level,
      timestamp: new Date().toISOString(),
      env: currentEnv,
      method: req.method,
      url: req.originalUrl,
      status: statusCode,
      statusMessage,
      responseTimeMs: duration,
      ip: req.ip,
      query:
        req.query && Object.keys(req.query).length > 0
          ? (req.query as Record<string, unknown>)
          : undefined,
      params:
        req.params && Object.keys(req.params).length > 0
          ? (req.params as Record<string, unknown>)
          : undefined,
      reqBody: safeBody,
      resBody: res.locals.capturedBody as string | undefined,
      contentType: req.headers["content-type"],
      userAgent: req.headers["user-agent"],
    };

    pushLog(entry);
    saveLogToMongo(entry);

    // Keep your original flat console log for Render's log stream
    let logMessage =
      `[${entry.timestamp}] ${req.method} ${req.originalUrl} | ` +
      `Status: ${statusCode} (${statusMessage}) | ` +
      `Time: ${duration}ms | IP: ${req.ip}`;

    if (entry.query) logMessage += ` | Query: ${JSON.stringify(entry.query)}`;
    if (entry.params)
      logMessage += ` | Params: ${JSON.stringify(entry.params)}`;
    if (entry.reqBody)
      logMessage += ` | Body: ${JSON.stringify(entry.reqBody).slice(0, 500)}`;
    if (entry.contentType)
      logMessage += ` | Content-Type: ${entry.contentType}`;
    if (entry.userAgent) logMessage += ` | User-Agent: ${entry.userAgent}`;

    console.log(logMessage);
  });

  next();
};
