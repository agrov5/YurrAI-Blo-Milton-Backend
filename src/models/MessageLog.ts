import mongoose, { Document, Schema } from "mongoose";
import { getMonthYear, addMessageToCurrentMonth } from "./MonthlyStats";

export type MessageType = "SMS" | "MMS";
export type RecipientType = "admin" | "dev" | "customer";

export interface MessageLogObject {
  messageType: MessageType;
  messageBody: string;
  to: string;
  // Who the message was directed at, derived from the destination number:
  // "admin" (ADMIN_PHONE), "dev" (DEV_PHONE), or "customer" (anything else).
  recipientType: RecipientType;
  // Estimated send cost in CAD.
  cost: number;
  success: boolean;
  // Denormalized calendar month/year for easy per-month querying.
  month: string;
  year: number;
}

export interface MessageLogDocument extends MessageLogObject, Document {}

const MessageLogSchema = new Schema<MessageLogDocument>(
  {
    messageType: { type: String, enum: ["SMS", "MMS"], required: true },
    messageBody: { type: String, default: "" },
    to: { type: String, default: "" },
    recipientType: {
      type: String,
      enum: ["admin", "dev", "customer"],
      default: "customer",
    },
    cost: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true },
);

// Common access pattern: all messages for a given month, newest first.
MessageLogSchema.index({ year: 1, month: 1, createdAt: -1 });

export const MessageLogModel =
  (mongoose.models.MessageLog as mongoose.Model<MessageLogDocument>) ||
  mongoose.model<MessageLogDocument>("MessageLog", MessageLogSchema);

// Per-message send costs in CAD. Override via env when voip.ms pricing changes.
export const SMS_COST_CAD = 0.0075
export const MMS_COST_CAD = 0.02

export function getMessageCost(messageType: MessageType): number {
  return messageType === "MMS" ? MMS_COST_CAD : SMS_COST_CAD;
}

// Max message body length per type. SMS is the standard single-segment GSM
// limit; MMS allows a much larger text payload (voip.ms accepts up to ~1600).
export const SMS_CHAR_LIMIT = 160;
export const MMS_CHAR_LIMIT = 1600;

export function getMessageCharLimit(messageType: MessageType): number {
  return messageType === "MMS" ? MMS_CHAR_LIMIT : SMS_CHAR_LIMIT;
}

// Normalize a phone number to its last 10 digits so values with/without a
// country code or formatting compare equal (e.g. "+1 (905) 555-1234" vs
// "9055551234").
function normalizePhone(phone: unknown): string {
  return String(phone ?? "").replace(/\D/g, "").slice(-10);
}

/**
 * Classifies a destination number by comparing it against ADMIN_PHONE and
 * DEV_PHONE. Falls back to "customer" for any other number.
 */
export function classifyRecipient(to: string): RecipientType {
  const normalized = normalizePhone(to);
  if (!normalized) return "customer";
  if (normalized === normalizePhone(process.env.ADMIN_PHONE)) return "admin";
  if (normalized === normalizePhone(process.env.DEV_PHONE)) return "dev";
  return "customer";
}

/**
 * Persists a sent message and rolls its cost into the current month's stats.
 * Never throws — logging must never break the actual message-sending flow.
 */
export async function logMessage(params: {
  messageType: MessageType;
  messageBody: string;
  to: string;
  // Optional override; when omitted the recipient is derived from `to`.
  recipientType?: RecipientType;
  success?: boolean;
}): Promise<void> {
  try {
    const { month, year } = getMonthYear();
    const cost = getMessageCost(params.messageType);
    const success = params.success ?? true;
    // Always classify by the destination number so a message to DEV_PHONE is
    // tagged "dev" even if the caller passed "customer".
    const recipientType = classifyRecipient(params.to);

    await MessageLogModel.create({
      messageType: params.messageType,
      messageBody: params.messageBody,
      to: params.to,
      recipientType,
      cost,
      success,
      month,
      year,
    });

    await addMessageToCurrentMonth(cost);
  } catch (err) {
    console.error("Failed to log message:", err);
  }
}
