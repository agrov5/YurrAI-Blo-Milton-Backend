import { Request, Response } from "express";
import {
  checkCustomerExists,
  createAppointment,
  locationID,
  cancelAppointment,
  getCustomerAppointments,
  addNotesToAppointment,
  findAvailableDates,
  findAvailableTimes,
  generateCCWidgetURL,
  findCustomerOrders,
} from "../util/booker_util";
import {
  AgentAppointment,
  CancelAppointment,
  CreateAppointmentResponse,
} from "../models/Appointment";
import {
  convertBookerAvailabilityToFriendlyTime,
  convertBookerAvailabilityEmployeeIdsToNames,
  ISOToFriendlyTime,
  convertISOtoFriendly,
} from "../util/db_util";
import {
  ExtractedVapiCallSummary,
  extractEndOfCallData,
  VapiWebhookBody,
  VapiCallModel,
} from "../models/Vapi";
import { getSettings } from "../models/Settings";
import { sendMessageToAdmin, sendMessageMMS } from "../util/phone_util";
import { GoogleGenAI } from "@google/genai";


// Helper function
const cleanAppointment = (appointment: any) => ({
  appointmentId: appointment.ID,
  status: appointment.Status?.Name,
  startDateTime: convertISOtoFriendly(appointment.StartDateTimeOffset),
  endDateTime: convertISOtoFriendly(appointment.EndDateTimeOffset),
  customer: {
    id: appointment.CustomerID,
    firstName: appointment.CustomerFirstName,
    lastName: appointment.CustomerLastName,
    email: appointment.CustomerEmail,
    phone: appointment.CustomerMobilePhone || appointment.CustomerHomePhone,
  },
  treatment: appointment.TreatmentName,
  employee: appointment.Employee
    ? `${appointment.Employee.FirstName} ${appointment.Employee.LastName}`
    : null,
  finalTotal: appointment.FinalTotal?.Amount,
  notes: appointment.Notes,
});

export const postCreateAppointment = async (req: Request, res: Response) => {
  try {
    const appointment: AgentAppointment = req.body;

    // Validate required fields
    if (
      !appointment.firstName ||
      !appointment.phone ||
      !appointment.treatmentName ||
      !appointment.appointmentDate ||
      !appointment.startTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide firstName, phone, treatmentName, appointmentDate, and startTime",
      });
    }

    const appointmentResponse: CreateAppointmentResponse =
      await createAppointment(appointment);

    if (appointmentResponse.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Appointment created successfully",
        locationID: locationID,
        appointment: cleanAppointment(appointmentResponse.Appointment),
        appointmentId: appointmentResponse.Appointment?.ID,
        cardOnFile: appointmentResponse.cardOnFile,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          "Failed to create appointment. Please check the details and try again",
        locationID: locationID,
        errors: appointmentResponse.ErrorMessage || "Unknown error",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const postAvailableDates = async (req: Request, res: Response) => {
  const body: {
    fromDate: string;
    toDate: string;
    employeeId?: number;
    treatmentName?: string;
  } = req.body;

  try {
    if (!body.fromDate || !body.toDate) {
      return res.status(400).json({
        success: false,
        message: "Both fromDate and toDate are required",
      });
    }
    const availableDates = await findAvailableDates(body);
    res.status(200).json({
      success: true,
      message: "Available dates retrieved successfully",
      locationID: locationID,
      fromDate: body.fromDate,
      toDate: body.toDate,
      dates: availableDates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available dates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const postAvailableTimes = async (req: Request, res: Response) => {
  const body: {
    date: string;
    time: string;
    treatmentName: string;
    employeeId?: number;
  } = req.body;

  try {
    if (!body.date || !body.treatmentName || !body.time) {
      return res.status(400).json({
        success: false,
        message: "Date, time, and treatmentName are required",
      });
    }

    const availableTimes = await findAvailableTimes(body);
    const timesWithEmployeeNames =
      await convertBookerAvailabilityEmployeeIdsToNames(availableTimes);
    const times = convertBookerAvailabilityToFriendlyTime(
      timesWithEmployeeNames,
    );
    res.status(200).json({
      success: true,
      message: "Available times retrieved successfully",
      locationID: locationID,
      date: body.date,
      treatment: body.treatmentName,
      times: times,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available times",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const postCancelAppointment = async (req: Request, res: Response) => {
  try {
    const appointment: CancelAppointment = req.body;

    // Validate required fields
    if (!appointment.appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Please provide appointmentId",
      });
    }

    const cancelAppointmentResponse: CreateAppointmentResponse =
      await cancelAppointment(appointment);

    if (cancelAppointmentResponse.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully",
        locationID: locationID,
        appointment: cancelAppointmentResponse.Appointment,
        appointmentId: cancelAppointmentResponse.Appointment?.ID,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          "Failed to create appointment. Please check the details and try again",
        locationID: locationID,
        errors: cancelAppointmentResponse.ErrorMessage || "Unknown error",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  const body: { firstName: string; phone: string } = req.body;
  try {
    if (!body.firstName || !body.phone) {
      return res.status(400).json({
        success: false,
        message: "First name and phone number are required",
      });
    }

    const customer = await checkCustomerExists(body.firstName, body.phone);
    if (customer) {
      res.status(200).json({
        success: true,
        message: "Customer found",
        locationID: locationID,
        customer: customer,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Customer '${body.firstName}' with phone ${body.phone} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve customer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  const body: {
    customerId: number;
    treatmentName?: string;
    date?: string;
    time?: string;
    onlyActive?: boolean;
    fromStartDate?: string;
    returnSingle?: boolean;
  } = req.body;

  try {
    if (!body.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const result = await getCustomerAppointments({
      customerId: body.customerId,
      treatmentName: body.treatmentName,
      date: body.date,
      time: body.time,
      onlyActive: body.onlyActive,
      fromStartDate: body.fromStartDate,
      returnSingle: body.returnSingle,
    });

    // Handle single appointment return
    if (body.returnSingle) {
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "No appointment found matching the criteria",
        });
      }

      const cleanedAppointment = cleanAppointment(result);

      return res.status(200).json({
        success: true,
        message: "Appointment retrieved successfully",
        locationID: locationID,
        appointment: cleanedAppointment,
      });
    }

    // Handle multiple appointments return
    const appointments = result as any[];

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No appointments found for this customer",
      });
    }

    const cleanedAppointments = appointments.map(cleanAppointment);

    res.status(200).json({
      success: true,
      message: "Appointments retrieved successfully",
      locationID: locationID,
      count: cleanedAppointments.length,
      appointments: cleanedAppointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve appointments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const postAddNotesToAppointment = async (
  req: Request,
  res: Response,
) => {
  try {
    const body: { appointmentId: number; notes: string } = req.body;
    if (!body.appointmentId || !body.notes) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide appointmentId and notes",
      });
    }

    const result = await addNotesToAppointment({
      appointmentId: body.appointmentId,
      notes: body.notes,
    });
    if (result.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Notes added to appointment successfully",
        locationID: locationID,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to add notes to appointment",
        locationID: locationID,
        errors: result.ErrorMessage || "Unknown error",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add notes to appointment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const postGenerateCCLink = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId || typeof customerId !== "number") {
      return res.status(400).json({
        success: false,
        message:
          "Missing or invalid customerId. Provide a numeric customerId in the request body.",
      });
    }

    const url = generateCCWidgetURL(customerId);

    res.json({
      success: true,
      message: "CC widget link generated successfully",
      customerId,
      url,
    });
  } catch (error) {
    console.error("Error generating CC link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CC widget link",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const { customerId, fromDateCreated } = req.body;
    if (!customerId || typeof customerId !== "number") {
      return res.status(400).json({
        success: false,
        message:
          "Missing or invalid customerId. Provide a numeric customerId in the request body.",
      });
    }

    const result = await findCustomerOrders(customerId, fromDateCreated);

    res.status(200).json({
      success: true,
      message: "Customer orders retrieved successfully",
      locationID: locationID,
      orders: result,
    });
  } catch (error) {
    console.error("Error retrieving customer orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve customer orders",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const vapiCallDataWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body as VapiWebhookBody;
    const summary = extractEndOfCallData(body);
    const savedCall = await VapiCallModel.create(summary);

    console.log("Received VAPI call data webhook, saved to", savedCall._id);

    // Auto-tag in the background — don't block the webhook response
    geminiTagCall(savedCall.summary, savedCall.transcript)
      .then((tags) => VapiCallModel.findByIdAndUpdate(savedCall._id, { tags }))
      .catch((err) => {
        console.error("Auto-tag failed for call", savedCall._id, err);
        VapiCallModel.findByIdAndUpdate(savedCall._id, { tags: ["Inconclusive"] })
          .catch((e) => console.error("Inconclusive fallback failed", savedCall._id, e));
      });

    // Short-call alert — fire-and-forget
    const durSec =
      savedCall.durationSeconds ??
      (savedCall.durationMinutes != null ? savedCall.durationMinutes * 60 : null);
    if (durSec != null) {
      getSettings()
        .then((settings) => {
          if (durSec < settings.shortCallThresholdSeconds) {
            const caller = savedCall.callerName || savedCall.callerNumber || "Unknown";
            const msg =
              `${caller} (${savedCall.callerNumber || "Unknown"}) lasted only ${Math.round(durSec)}s`
            return sendMessageToAdmin(msg, "SMS");
          }
        })
        .catch((err) => console.error("Short-call alert failed for call", savedCall._id, err));
    }

    res.status(200).json({
      success: true,
      message: "Call data received successfully",
      data: summary,
      recordId: savedCall._id,
    });
  } catch (error) {
    console.error("Error processing VAPI call data webhook:", error);
    res.status(400).json({
      success: false,
      message: "Failed to process VAPI call data webhook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


const PREDEFINED_TAGS = [
  // Primary intent
  "New Appointment Request",
  "Reschedule Request",
  "Cancel Request",
  "Pricing Question",
  "Hours / Location / Directions",
  "Service Question",
  "Existing Appointment Question",
  "Wrong Department / Not a Client",
  // Resolution
  "Appointment Booked",
  "Appointment Rescheduled",
  "Appointment Canceled",
  "FAQ Resolved",
  "FAQ Not Resolved",
  "Message Taken / Callback Requested",
  "Message sent to Admin",
  "Caller Declined Further Service",
  // Failure modes
  "Hangup During Intake",
  "Silent / No Response",
  "Couldn't Collect Required Info",
  "No Availability / No Suitable Times",
  "Out of Scope Request",
  "Language Barrier",
  "Tool / Calendar Error",
  "Bad Audio / Couldn't Understand",
  "Inconclusive",
];

async function geminiTagCall(summary: string | null | undefined, transcript: string | null | undefined): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are analyzing a phone call from a beauty salon (Blo Blowout Bar). Based on the call summary and transcript below, assign the most relevant tags from the list.

Tags are grouped into three categories — assign one or more from each relevant category:

PRIMARY INTENT (why did they call?):
- "New Appointment Request": Caller wanted to book a new appointment
- "Reschedule Request": Caller wanted to move an existing appointment (use even if it failed)
- "Cancel Request": Caller wanted to cancel an appointment (use even if it failed)
- "Pricing Question": Caller asked about pricing or insurance
- "Hours / Location / Directions": Caller asked about hours, address, or how to get there
- "Service Question": Caller asked what services are offered, prep instructions, etc.
- "Existing Appointment Question": Caller asked to confirm details of an existing appointment
- "Wrong Department / Not a Client": Spam, vendor, sales, or clearly wrong number

RESOLUTION (what actually happened?):
- "Appointment Booked": A new appointment was successfully booked
- "Appointment Rescheduled": An existing appointment was successfully rescheduled
- "Appointment Canceled": An appointment was successfully canceled
- "FAQ Resolved": A question was asked and fully answered
- "FAQ Not Resolved": A question was asked but could not be fully answered
- "Message Taken / Callback Requested": A message was taken or a callback was promised
- "Message sent to Admin": A message was relayed or sent to the admin/staff
- "Caller Declined Further Service": Caller chose not to proceed after receiving info

FAILURE MODES (if something went wrong):
- "Hangup During Intake": Caller hung up before the interaction was complete
- "Silent / No Response": No audible response from the caller
- "Couldn't Collect Required Info": Needed info (name, contact, etc.) was not obtained
- "No Availability / No Suitable Times": No appointment slots matched the caller's needs
- "Out of Scope Request": Request was outside what the salon handles (billing dispute, emergency, etc.)
- "Language Barrier": Communication failed due to language
- "Tool / Calendar Error": A booking system or integration error occurred
- "Bad Audio / Couldn't Understand": Call quality prevented understanding
- "Inconclusive": None of the above apply, or the call purpose is completely unclear

Call Summary: ${summary || "N/A"}
Call Transcript: ${transcript ? transcript.substring(0, 3000) : "N/A"}

Respond ONLY with a valid JSON array of applicable tag strings exactly as written above.
Example: ["New Appointment Request", "Appointment Booked"]
Use "Inconclusive" only if truly nothing else fits.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const rawText = response.text?.trim() ?? "[]";
  console.log("[geminiTagCall] raw response text:", rawText);
  const jsonMatch = rawText.match(/\[[\s\S]*?\]/);
  const parsed: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  const valid = parsed.filter((t) => PREDEFINED_TAGS.includes(t));
  const result = valid.length > 0 ? valid : ["Inconclusive"];
  console.log("[geminiTagCall] tags assigned:", result);
  return result;
}

export const sendCCLinkToCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, phone, firstName } = req.body as {
      customerId?: number;
      phone?: string;
      firstName?: string;
    };

    if (!customerId || typeof customerId !== "number") {
      return res.status(400).json({ success: false, message: "customerId (number) is required" });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, message: "phone is required" });
    }

    const url = generateCCWidgetURL(customerId);
    const name = (firstName || "there").trim();
    const message =
      `Dear ${name}, you have an upcoming appointment at Blo Milton that requires a credit card on file. ` +
      `Please complete your booking by providing your payment details using the following link: ${url}`;

    await sendMessageMMS(phone.trim(), message);

    res.json({ success: true, sentMessage: message, sentTo: phone.trim() });
  } catch (error) {
    console.error("send-cc-link error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send CC link",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateCallTags = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags } = req.body as { tags: string[] };

    if (!Array.isArray(tags)) {
      return res.status(400).json({ success: false, message: "tags must be an array" });
    }

    const sanitized = tags.map((t) => String(t).trim()).filter(Boolean);
    const call = await VapiCallModel.findByIdAndUpdate(
      id,
      { tags: sanitized },
      { new: true },
    );

    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    res.json({ success: true, tags: call.tags });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update tags",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


export const getVapiCostByMonth = async (req: Request, res: Response) => {
  const body: { month: string; year: string } = req.body;

  // Calculate begin and end dates dynamically
  const dateBegin = new Date(`${body.month} 1 ${body.year}`);
  const dateEnd = new Date(
    dateBegin.getFullYear(),
    dateBegin.getMonth() + 1,
    0,
  );
  dateEnd.setHours(23, 59, 59, 999); // Set to end of day

  const ISOdateBegin = dateBegin.toISOString();
  const ISOdateEnd = dateEnd.toISOString();

  try {
    const costs = await VapiCallModel.aggregate([
      {
        $match: {
          startedAt: {
            $gte: ISOdateBegin,
            $lte: ISOdateEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          callCount: { $sum: 1 },
          totalMinutes: { $sum: "$durationMinutes" },
        },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: dateBegin.getFullYear() },
              "-",
              {
                $cond: [
                  { $lte: [dateBegin.getMonth() + 1, 9] },
                  { $concat: ["0", { $toString: dateBegin.getMonth() + 1 }] },
                  { $toString: dateBegin.getMonth() + 1 },
                ],
              },
            ],
          },
          totalCost: 1,
          callCount: 1,
          totalMinutes: 1,
        },
      },
    ]);

    // If no documents found in date range, return zero cost
    const result =
      costs.length > 0
        ? costs[0]
        : {
            month: `${dateBegin.getFullYear()}-${String(dateBegin.getMonth() + 1).padStart(2, "0")}`,
            totalCost: 0,
            callCount: 0,
            totalMinutes: 0,
          };

    res.status(200).json({
      success: true,
      message: "VAPI costs by month retrieved successfully",
      locationID: locationID,
      month: result.month,
      totalCost: result.totalCost || 0,
      callCount: result.callCount || 0,
      totalMinutes: result.totalMinutes || 0,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve VAPI costs by month",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

