import mongoose, { Document, Schema } from "mongoose";

export type LogLevel = "info" | "warn" | "error";
export type LogType = "http" | "axios" | "app";

export interface IRequestLog extends Document {
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
  axiosRequestNumber?: number;
  axiosBaseURL?: string;
  axiosHeaders?: Record<string, unknown>;
  message?: string;
  meta?: unknown;
}

const RequestLogSchema = new Schema<IRequestLog>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    level: { type: String, required: true },
    timestamp: { type: String, required: true },
    env: { type: String, required: true },
    method: { type: String, required: false },
    url: { type: String, required: false },
    status: { type: Number, required: false },
    statusMessage: { type: String, required: false },
    responseTimeMs: { type: Number, required: false },
    ip: { type: String, required: false },
    query: { type: Schema.Types.Mixed, required: false },
    params: { type: Schema.Types.Mixed, required: false },
    reqBody: { type: Schema.Types.Mixed, required: false },
    resBody: { type: String, required: false },
    contentType: { type: String, required: false },
    userAgent: { type: String, required: false },
    axiosRequestNumber: { type: Number, required: false },
    axiosBaseURL: { type: String, required: false },
    axiosHeaders: { type: Schema.Types.Mixed, required: false },
    message: { type: String, required: false },
    meta: { type: Schema.Types.Mixed, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const RequestLogModel =
  (mongoose.models.RequestLog as mongoose.Model<IRequestLog>) ||
  mongoose.model<IRequestLog>("RequestLog", RequestLogSchema);
