import mongoose, { Document, Schema, model } from "mongoose";

export interface ExtractedVapiCallSummary {
  /** Duration in minutes (best for reporting/billing) */
  durationMinutes: number;
  /** Also keep seconds if you want */
  durationSeconds: number;

  callerName: string;
  callerNumber: string;
  sipUri: string;

  transcript: string;

  recordingUrl: string;
  stereoRecordingUrl: string;

  cost: number;

  /** Handy identifiers */
  callId: string;
  assistantId: string;
  phoneNumberId: string;

  startedAt: string;
  endedAt: string;
  endedReason: string;

  callDate: string;
  startTime: string;
  endTime: string;
}

export interface VapiWebhookBody {
  message: VapiWebhookMessage;
}

export interface VapiWebhookMessage {
  type: string;
  customer: {
    name?: string;
    number?: string;
    sipUri?: string;
  };
  transcript?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  durationMinutes: number;
  durationSeconds: number;
  cost: number;
  call: {
    id: string;
    assistantId: string;
    phoneNumberId: string;
  };
  startedAt: string;
  endedAt: string;
  endedReason: string;
  artifact?: {
    transcript?: string;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
  };
}

export interface VapiCallDocument extends ExtractedVapiCallSummary, Document {}

const VapiCallSchema = new Schema<VapiCallDocument>(
  {
    durationMinutes: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },

    callerName: { type: String, required: true },
    callerNumber: { type: String, required: true },
    sipUri: { type: String, required: true },

    transcript: { type: String, required: true },

    recordingUrl: { type: String, required: true },
    stereoRecordingUrl: { type: String, required: true },

    cost: { type: Number, required: true },

    callId: { type: String, required: true },
    assistantId: { type: String, required: true },
    phoneNumberId: { type: String, required: true },

    startedAt: { type: String, required: true },
    endedAt: { type: String, required: true },
    endedReason: { type: String, required: true },

    callDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const VapiCallModel =
  (mongoose.models.VapiCall as mongoose.Model<VapiCallDocument>) ||
  mongoose.model<VapiCallDocument>("VapiCall", VapiCallSchema);
