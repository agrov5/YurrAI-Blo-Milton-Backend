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
  cleanAppointment,
  getAppointmentById,
} from "../util/booker_util";
import {
  AgentAppointment,
  CancelAppointment,
  CleanAppointment,
  CreateAppointmentResponse,
} from "../models/Appointment";
import {
  convertBookerAvailabilityToFriendlyTime,
  convertBookerAvailabilityEmployeeIdsToNames,
  ISOToFriendlyTime,
  convertISOtoFriendly,
  convertToMMDD,
} from "../util/db_util";
import {
  ExtractedVapiCallSummary,
  extractEndOfCallData,
  VapiWebhookBody,
  VapiCallModel,
} from "../models/Vapi";
import { getSettings } from "../models/Settings";
import { sendMessageToAdmin, sendMessageMMS } from "../util/phone_util";
import { geminiTagCall } from "../util/gemini_util";
import {
  populateMonthlyStats,
  addRevenueToCurrentMonth,
  getMonthYear,
} from "../models/MonthlyStats";
import { sendMonthlyStatsEmail, sendCustomEmail } from "../util/resend_util";
import { convertUsdToCad } from "../util/currency_util";

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
      const cleaned = cleanAppointment(appointmentResponse.Appointment);

      // Add the booked appointment's final total to this month's revenue —
      // fire-and-forget so a stats failure never blocks the booking response.
      addRevenueToCurrentMonth(cleaned.finalTotal).catch((err) =>
        console.error(
          "Failed to add appointment revenue to monthly stats:",
          err,
        ),
      );

      res.status(200).json({
        success: true,
        message: "Appointment created successfully",
        locationID: locationID,
        appointment: cleaned,
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

    const existingAppointment: CleanAppointment | null =
      await getAppointmentById(appointment.appointmentId);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: `Appointment with id ${appointment.appointmentId} not found`,
      });
    }

    // Disallow cancellations within 24 hours of the appointment start time.
    // Use the raw ISO timestamp — `startDateTime` is a human-readable string
    // that `new Date(...)` cannot parse.
    if (existingAppointment.startDateTimeISO) {
      const startTime = new Date(
        existingAppointment.startDateTimeISO,
      ).getTime();
      const hoursUntilStart = (startTime - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilStart < 24) {
        await sendMessageToAdmin(
          `Cancel within 24 hours requested by ${existingAppointment.customer.firstName} ${existingAppointment.customer.lastName?.[0]}. for ${existingAppointment.treatment} on ${convertToMMDD(existingAppointment.startDateTime || "")}`,
          "SMS",
        );
        return res.status(400).json({
          success: false,
          message:
            "Appointments cannot be cancelled within 24 hours of the start time. A message has been sent to Blo Milton team and they will follow up.",
          locationID: locationID,
        });
      }
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
          cancelAppointmentResponse.ErrorMessage ||
          "Failed to cancel appointment. Please check the details and try again",
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
    if (!body.phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await checkCustomerExists(body.phone, false);
    if (result) {
      const multiple = result.length > 1;
      res.status(200).json({
        success: true,
        message: multiple ? "Multiple customers found" : "Customer found",
        locationID: locationID,
        ...(multiple ? { customers: result } : { customer: result[0] }),
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Customer with phone ${body.phone} not found`,
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

    // Vapi reports cost in USD; convert to CAD before persisting so every
    // stored cost (and the stats derived from it) is in CAD.
    summary.cost = await convertUsdToCad(summary.cost);

    const savedCall = await VapiCallModel.create(summary);

    console.log("Received VAPI call data webhook, saved to", savedCall._id);

    // Auto-tag in the background — don't block the webhook response
    geminiTagCall(savedCall.summary, savedCall.transcript)
      .then((tags) => VapiCallModel.findByIdAndUpdate(savedCall._id, { tags }))
      .catch((err) => {
        // Leave the call untagged on failure — the dashboard surfaces these as "No Tags"
        console.error("Auto-tag failed for call", savedCall._id, err);
      });

    // Short-call alert — fire-and-forget
    const durSec =
      savedCall.durationSeconds ??
      (savedCall.durationMinutes != null
        ? savedCall.durationMinutes * 60
        : null);
    if (durSec != null) {
      getSettings()
        .then((settings) => {
          if (durSec < settings.shortCallThresholdSeconds) {
            const caller =
              savedCall.callerName || savedCall.callerNumber || "Unknown";
            const msg = `${caller} (${savedCall.callerNumber || "Unknown"}) lasted only ${Math.round(durSec)}s`;
            return sendMessageToAdmin(msg, "SMS");
          }
        })
        .catch((err) =>
          console.error("Short-call alert failed for call", savedCall._id, err),
        );
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

export const sendCCLinkToCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, phone, firstName } = req.body as {
      customerId?: number;
      phone?: string;
      firstName?: string;
    };

    if (!customerId || typeof customerId !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "customerId (number) is required" });
    }
    if (!phone?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "phone is required" });
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
      return res
        .status(400)
        .json({ success: false, message: "tags must be an array" });
    }

    const sanitized = tags.map((t) => String(t).trim()).filter(Boolean);
    const call = await VapiCallModel.findByIdAndUpdate(
      id,
      { tags: sanitized },
      { new: true },
    );

    if (!call) {
      return res
        .status(404)
        .json({ success: false, message: "Call not found" });
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

/**
 * Recomputes the monthly stats from calls (preserving accumulated revenue) and
 * emails the report to ADMIN_EMAIL and DEV_EMAIL. Defaults to the current month;
 * accepts optional { month, year } in the body to target a different month.
 */
export const sendMonthlyStatsReport = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as { month?: string; year?: number | string };
    const current = getMonthYear();
    const month = body.month?.trim() || current.month;
    const year = body.year != null ? Number(body.year) : current.year;

    if (!Number.isInteger(year)) {
      return res
        .status(400)
        .json({ success: false, message: "year must be a valid number" });
    }

    const stats = await populateMonthlyStats(month, year);
    await sendMonthlyStatsEmail(stats.toObject());

    res.status(200).json({
      success: true,
      message: `Monthly stats for ${month} ${year} populated and emailed`,
      stats,
    });
  } catch (error) {
    console.error("Error sending monthly stats report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send monthly stats report",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** Sends an arbitrary email to a custom address via Resend. */
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = (req.body ?? {}) as {
      to?: string | string[];
      subject?: string;
      html?: string;
      text?: string;
    };

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return res
        .status(400)
        .json({ success: false, message: "'to' is required" });
    }
    if (!subject?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "'subject' is required" });
    }
    if (!html && !text) {
      return res.status(400).json({
        success: false,
        message: "Either 'html' or 'text' is required",
      });
    }

    const data = await sendCustomEmail({ to, subject, html, text });

    res
      .status(200)
      .json({ success: true, message: "Email sent", id: data?.id, sentTo: to });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
