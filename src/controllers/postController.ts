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
  treatmentLookupByName,
  businessTimeZone,
  ISOToFriendlyTime,
  convertISOtoFriendly,
  convertToMMDD,
  todayInBusinessTimeZone,
} from "../util/db_util";
import {
  ExtractedVapiCallSummary,
  extractEndOfCallData,
  VapiWebhookBody,
  VapiCallModel,
} from "../models/Vapi";
import { getSettings } from "../models/Settings";
import { sendMessageToAdmin, sendMessageMMS } from "../util/phone_util";
import { tagCall } from "../util/ai_util";
import {
  populateMonthlyStats,
  addRevenueToCurrentMonth,
  getMonthYear,
} from "../models/MonthlyStats";
import { sendMonthlyStatsEmail, sendCustomEmail } from "../util/resend_util";
import { convertUsdToCad } from "../util/currency_util";
import { EmployeeModel } from "../models/Employee";

// Every tool result stays in the Vapi conversation and is re-sent to the LLM
// on each later turn, so agent-facing responses must stay small.
// Vapi tools call these endpoints with ?view=agent; the dashboard does not.
const isAgentView = (req: Request) => req.query.view === "agent";

const agentAppointment = (appointment: any) => {
  const { startDateTimeISO, endDateTimeISO, customer, ...rest } =
    cleanAppointment(appointment);
  return { ...rest, treatment: rest.treatment?.trim() };
};

const NEAREST_ALTERNATIVES = 6;

const toMinutes = (hhmm: string): number | null => {
  const match = (hhmm || "").match(/^(\d{1,2}):?(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Wall-clock minutes of the day at the salon, so DST never shifts a slot.
const isoToLocalMinutes = (iso: string): number | null =>
  toMinutes(
    new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: businessTimeZone(),
    }),
  );

// Booker returns availability as blocks, not slots: per the Availability API
// docs, every startTimeInterval step from startDateTime to endDateTime
// (inclusive) is a valid start, and the block's employees can take any of
// them. Same rule as checkTimeSlotAvailability in booker_util. This expands
// the blocks for the requested service and summarises them for the agent.
const buildAgentAvailability = async (
  payload: any,
  serviceId: number,
  requestedTime: string,
) => {
  const windows: { start: number; end: number; employeeIds: number[] }[] = [];
  const staffByStart = new Map<number, Set<number>>();
  let interval = 15;
  let duration: number | undefined;

  for (const location of Array.isArray(payload) ? payload : []) {
    interval = Number(location?.startTimeInterval) || interval;
    for (const category of location?.serviceCategories ?? []) {
      for (const service of category?.services ?? []) {
        if (service?.serviceId !== serviceId) continue;
        duration = service.duration;
        const blocks = [
          ...(service.availability ?? []),
          ...(service.callToBookAvailability ?? []),
          ...(service.callToBookAvaiability ?? []),
        ];
        for (const block of blocks) {
          const start = isoToLocalMinutes(block?.startDateTime);
          if (start === null) continue;
          const end = Math.max(
            start,
            isoToLocalMinutes(block?.endDateTime) ?? start,
          );
          const employeeIds: number[] = (block.employees ?? []).filter(
            (id: unknown) => typeof id === "number",
          );
          windows.push({ start, end, employeeIds });
          for (let t = start; t <= end; t += interval) {
            const staff = staffByStart.get(t) ?? new Set<number>();
            employeeIds.forEach((id) => staff.add(id));
            staffByStart.set(t, staff);
          }
        }
      }
    }
  }

  const requested = toMinutes(requestedTime);
  const requestedStaff =
    requested === null ? undefined : staffByStart.get(requested);

  const employees = await EmployeeModel.find(
    { ID: { $in: [...(requestedStaff ?? [])] } },
    { ID: 1, FullName: 1, DisplayName: 1, _id: 0 },
  )
    .lean()
    .exec();
  const nameById = new Map<number, string>(
    employees.map((e: any) => [e.ID, (e.FullName || e.DisplayName || "").trim()]),
  );

  const starts = [...staffByStart.keys()].sort((a, b) => a - b);
  const nearest =
    requested === null
      ? []
      : starts
          .filter((t) => t !== requested)
          .sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))
          .slice(0, NEAREST_ALTERNATIVES)
          .sort((a, b) => a - b);

  windows.sort((a, b) => a.start - b.start);

  return {
    durationMinutes: duration,
    startEveryMinutes: interval,
    requestedTimeAvailable: Boolean(requestedStaff),
    staffAtRequestedTime: [...(requestedStaff ?? [])].map(
      (id) => nameById.get(id) ?? id,
    ),
    nearestOtherTimes: nearest.map(
      (t) => `${formatMinutes(t)} (${staffByStart.get(t)?.size ?? 0} staff)`,
    ),
    openWindows: windows.map(
      (w) =>
        `${formatMinutes(w.start)}${w.end > w.start ? `-${formatMinutes(w.end)}` : ""} (${w.employeeIds.length} staff)`,
    ),
  };
};

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

      if (isAgentView(req)) {
        return res.status(200).json({
          success: true,
          message: "Appointment created successfully",
          appointment: agentAppointment(appointmentResponse.Appointment),
          cardOnFile: appointmentResponse.cardOnFile,
        });
      }

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
// YYYY-MM-DD strictly before today at the salon, or false if unparseable.
const isPastDate = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  if (isNaN(new Date(date).getTime())) return false;
  return date < todayInBusinessTimeZone();
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
    if (isPastDate(body.fromDate) || isPastDate(body.toDate)) {
      return res.status(400).json({
        success: false,
        message: `Date ${isPastDate(body.fromDate) ? body.fromDate : body.toDate} has already passed. Today is ${todayInBusinessTimeZone()}; use a date from today onward.`,
      });
    }
    const availableDates = await findAvailableDates(body);

    // Flatten Booker's location > category > service nesting to the dates.
    const dates = new Set<string>();
    for (const location of Array.isArray(availableDates) ? availableDates : []) {
      for (const category of location?.serviceCategories ?? []) {
        for (const service of category?.services ?? []) {
          for (const day of service?.availability ?? []) {
            if (typeof day === "string") dates.add(day.slice(0, 10));
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      fromDate: body.fromDate,
      toDate: body.toDate,
      dates: [...dates].sort(),
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

    if (isPastDate(body.date)) {
      return res.status(400).json({
        success: false,
        message: `Date ${body.date} has already passed. Today is ${todayInBusinessTimeZone()}; use a date from today onward.`,
      });
    }

    const treatment = await treatmentLookupByName(body.treatmentName);
    if (!treatment || !treatment.ID) {
      return res.status(400).json({
        success: false,
        message: `Treatment '${body.treatmentName}' not found. Use an exact name from get_treatments.`,
      });
    }

    const availableTimes = await findAvailableTimes(body);
    const availability = await buildAgentAvailability(
      availableTimes,
      treatment.ID,
      body.time,
    );
    res.status(200).json({
      success: true,
      date: body.date,
      treatment: (treatment.TreatmentName || body.treatmentName).trim(),
      ...availability,
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
      if (isAgentView(req)) {
        return res.status(200).json({
          success: true,
          message: "Appointment cancelled successfully",
          appointment: agentAppointment(cancelAppointmentResponse.Appointment),
        });
      }

      res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully",
        locationID: locationID,
        appointment: cleanAppointment(cancelAppointmentResponse.Appointment),
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

    const result = await checkCustomerExists(body.phone, false, body.firstName);
    if (result && isAgentView(req)) {
      return res.status(200).json({
        success: true,
        message:
          result.length > 1 ? "Multiple customers found" : "Customer found",
        customers: result.map((c) => ({
          customerId: c.CustomerID,
          firstName: c.Customer?.FirstName?.trim(),
          lastName: c.Customer?.LastName?.trim(),
        })),
      });
    }
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

      const cleanedAppointment = isAgentView(req)
        ? agentAppointment(result)
        : cleanAppointment(result);

      return res.status(200).json({
        success: true,
        message: "Appointment retrieved successfully",
        locationID: locationID,
        appointment: cleanedAppointment,
      });
    }

    // Handle multiple appointments return
    let appointments = result as any[];

    // The agent only acts on upcoming appointments; past ones just add tokens.
    if (isAgentView(req) && !body.date && !body.fromStartDate && appointments) {
      const now = Date.now();
      appointments = appointments.filter(
        (a) =>
          !a.StartDateTimeOffset ||
          new Date(a.StartDateTimeOffset).getTime() >= now,
      );
    }

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No appointments found for this customer",
      });
    }

    const cleanedAppointments = appointments.map(
      isAgentView(req) ? agentAppointment : cleanAppointment,
    );

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
    tagCall(savedCall.summary, savedCall.transcript)
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
