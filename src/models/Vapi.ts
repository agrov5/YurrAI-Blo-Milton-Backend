import mongoose, { Document, Schema, model } from "mongoose";

export interface ExtractedVapiCallSummary {
  /** Duration in minutes (best for reporting/billing) */
  durationMinutes?: number | null;
  /** Also keep seconds if you want */
  durationSeconds?: number | null;

  callerName?: string | null;
  callerNumber?: string | null;
  sipUri?: string | null;

  /** Call summary (prefer analysis.summary, fall back to message.summary) */
  summary?: string | null;

  transcript?: string | null;

  recordingUrl?: string | null;
  stereoRecordingUrl?: string | null;

  cost?: number | null;

  /** Handy identifiers */
  callId?: string | null;
  assistantId?: string | null;
  phoneNumberId?: string | null;

  startedAt?: string | null;
  endedAt?: string | null;
  endedReason?: string | null;

  callDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface VapiWebhookBody {
  message?: VapiWebhookMessage | null;
}

export interface VapiWebhookMessage {
  type?: string;
  customer?: {
    name?: string;
    number?: string;
    sipUri?: string;
  };
  transcript?: string;
  summary?: string;
  analysis?: {
    summary?: string;
  };
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  cost?: number;
  call?: {
    id?: string;
    assistantId?: string;
    phoneNumberId?: string;
  };
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  artifact?: {
    transcript?: string;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
  };
}

export interface VapiCallDocument extends ExtractedVapiCallSummary, Document {
  callSummary?: ExtractedVapiCallSummary | any;
}

const VapiCallSchema = new Schema<VapiCallDocument>(
  {
    durationMinutes: { type: Number, required: false, default: null },
    durationSeconds: { type: Number, required: false, default: null },

    callerName: { type: String, required: false, default: null },
    callerNumber: { type: String, required: false, default: null },
    sipUri: { type: String, required: false, default: null },

    summary: { type: String, required: false, default: null },

    transcript: { type: String, required: false, default: null },

    recordingUrl: { type: String, required: false, default: null },
    stereoRecordingUrl: { type: String, required: false, default: null },

    cost: { type: Number, required: false, default: null },

    callId: { type: String, required: false, default: null },
    assistantId: { type: String, required: false, default: null },
    phoneNumberId: { type: String, required: false, default: null },

    startedAt: { type: String, required: false, default: null },
    endedAt: { type: String, required: false, default: null },
    endedReason: { type: String, required: false, default: null },

    callDate: { type: String, required: false, default: null },
    startTime: { type: String, required: false, default: null },
    endTime: { type: String, required: false, default: null },
    // full parsed summary for reference/searching
    callSummary: { type: Schema.Types.Mixed, required: false, default: null },
  },
  {
    timestamps: true,
  },
);

function safeTrim(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function extractEndOfCallData(
  body: VapiWebhookBody,
): ExtractedVapiCallSummary {
  const m = body?.message;

  if (m?.type !== "end-of-call-report") {
    throw new Error(`Unexpected webhook type: ${m?.type}`);
  }

  const callerName = safeTrim(m?.customer?.name);
  const callerNumber = safeTrim(m?.customer?.number);
  const sipUri = safeTrim(m?.customer?.sipUri);

  const summary = safeTrim(m?.analysis?.summary) ?? safeTrim(m?.summary);
  const transcript =
    safeTrim(m?.transcript) ?? safeTrim(m?.artifact?.transcript);
  const recordingUrl =
    safeTrim(m?.recordingUrl) ?? safeTrim(m?.artifact?.recordingUrl);
  const stereoRecordingUrl =
    safeTrim(m?.stereoRecordingUrl) ??
    safeTrim(m?.artifact?.stereoRecordingUrl);

  const durationMinutes = safeNumber(m?.durationMinutes);
  const durationSeconds = safeNumber(m?.durationSeconds);
  const cost = safeNumber(m?.cost);

  const startedAt = safeTrim(m?.startedAt);
  const endedAt = safeTrim(m?.endedAt);
  const startedAtDate = startedAt ? new Date(startedAt) : null;
  const endedAtDate = endedAt ? new Date(endedAt) : null;

  const startTime =
    startedAtDate && !isNaN(startedAtDate.getTime())
      ? startedAtDate.toISOString()
      : null;
  const endTime =
    endedAtDate && !isNaN(endedAtDate.getTime())
      ? endedAtDate.toISOString()
      : null;
  const callDate = startTime ? startTime.split("T")[0] : null;

  return {
    durationMinutes,
    durationSeconds,

    callerName,
    callerNumber,
    sipUri,

    summary,
    transcript,

    recordingUrl,
    stereoRecordingUrl,

    cost,

    callId: safeTrim(m?.call?.id),
    assistantId: safeTrim(m?.call?.assistantId),
    phoneNumberId: safeTrim(m?.call?.phoneNumberId),

    startedAt,
    endedAt,
    endedReason: safeTrim(m?.endedReason),
    callDate,
    startTime,
    endTime,
  };
}

export const VapiCallModel =
  (mongoose.models.VapiCall as mongoose.Model<VapiCallDocument>) ||
  mongoose.model<VapiCallDocument>("VapiCall", VapiCallSchema);
