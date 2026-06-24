import { GoogleGenAI, Type } from "@google/genai";

// Why did they call? Exactly one is assigned.
export const INTENT_TAGS = [
  "New Appointment Request",
  "Reschedule Request",
  "Cancel Request",
  "Pricing Question",
  "Hours / Location / Directions",
  "Service Question",
  "Existing Appointment Question",
  "Wrong Department / Not a Client",
];

// What actually happened? At most one is assigned.
export const RESOLUTION_TAGS = [
  "Appointment Booked",
  "Appointment Rescheduled",
  "Appointment Canceled",
  "FAQ Resolved",
  "FAQ Not Resolved",
  "Message Taken / Callback Requested",
  "Message sent to Admin",
  "Caller Declined Further Service",
];

// What went wrong, if anything? At most one is assigned.
export const FAILURE_TAGS = [
  "Hangup During Intake",
  "Silent / No Response",
  "Couldn't Collect Required Info",
  "No Availability / No Suitable Times",
  "Out of Scope Request",
  "Language Barrier",
  "Tool / Calendar Error",
  "Bad Audio / Couldn't Understand",
];

export async function geminiTagCall(summary: string | null | undefined, transcript: string | null | undefined): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are analyzing a phone call from a beauty salon (Blo Blowout Bar). Based on the call summary and transcript below, classify the call.

PRIMARY INTENT (why did they call?) — choose exactly one:
- "New Appointment Request": Caller wanted to book a new appointment
- "Reschedule Request": Caller wanted to move an existing appointment (use even if it failed)
- "Cancel Request": Caller wanted to cancel an appointment (use even if it failed)
- "Pricing Question": Caller asked about pricing or insurance
- "Hours / Location / Directions": Caller asked about hours, address, or how to get there
- "Service Question": Caller asked what services are offered, prep instructions, etc.
- "Existing Appointment Question": Caller asked to confirm details of an existing appointment
- "Wrong Department / Not a Client": Spam, vendor, sales, or clearly wrong number

RESOLUTION (what actually happened?) — choose one, or leave null if nothing was resolved:
- "Appointment Booked": A new appointment was successfully booked
- "Appointment Rescheduled": An existing appointment was successfully rescheduled
- "Appointment Canceled": An appointment was successfully canceled
- "FAQ Resolved": A question was asked and fully answered
- "FAQ Not Resolved": A question was asked but could not be fully answered
- "Message Taken / Callback Requested": A message was taken or a callback was promised
- "Message sent to Admin": A message was relayed or sent to the admin/staff
- "Caller Declined Further Service": Caller chose not to proceed after receiving info

FAILURE MODE (if something went wrong) — choose one, or leave null if the call went fine:
- "Hangup During Intake": Caller hung up before the interaction was complete
- "Silent / No Response": No audible response from the caller
- "Couldn't Collect Required Info": Needed info (name, contact, etc.) was not obtained
- "No Availability / No Suitable Times": No appointment slots matched the caller's needs
- "Out of Scope Request": Request was outside what the salon handles (billing dispute, emergency, etc.)
- "Language Barrier": Communication failed due to language
- "Tool / Calendar Error": A booking system or integration error occurred
- "Bad Audio / Couldn't Understand": Call quality prevented understanding

Examples:
- A caller books a haircut → primaryIntent "New Appointment Request", resolution "Appointment Booked", failureMode null.
- A caller wants to reschedule but no times fit → primaryIntent "Reschedule Request", resolution null, failureMode "No Availability / No Suitable Times".

Call Summary: ${summary || "N/A"}
Call Transcript: ${transcript || "N/A"}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryIntent: { type: Type.STRING, enum: INTENT_TAGS },
          resolution: { type: Type.STRING, enum: RESOLUTION_TAGS, nullable: true },
          failureMode: { type: Type.STRING, enum: FAILURE_TAGS, nullable: true },
        },
        required: ["primaryIntent"],
        propertyOrdering: ["primaryIntent", "resolution", "failureMode"],
      },
    },
  });

  const rawText = response.text?.trim() ?? "{}";
  console.log("[geminiTagCall] raw response text:", rawText);

  const parsed = JSON.parse(rawText) as {
    primaryIntent?: string;
    resolution?: string | null;
    failureMode?: string | null;
  };
  const result = [parsed.primaryIntent, parsed.resolution, parsed.failureMode]
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  console.log("[geminiTagCall] tags assigned:", result);
  return result;
}
