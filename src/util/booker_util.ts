import axios from "axios";
import { Treatment, TreatmentModel } from "../models/Treatment";
import {
  getTreatmentIds,
  dateToISO,
  treatmentLookupByName,
  employeeLookupByName,
  determineEndTime,
  convert24toISO,
  isoToDate,
} from "./db_util";
import {
  AddAppointmentNotes,
  AgentAppointment,
  CancelAppointment,
  CreateAppointmentResponse,
  FullAppointmentObject,
} from "../models/Appointment";
import { Employee } from "../models/Employee";
import { CreditCardResponse, CreditCardRecord } from "../models/CreditCard";
import { sendMessage } from "./phone_util";
import { Customer } from "../models/Customer";
import { getTreatmentById } from "../controllers/getController";

// const generateAccessToken = async () => {
//   try {
//     // Header: {"Content-Type": "application/x-www-form-urlencoded", "Ocp-Apim-Subscription-Key": "your_subscription_key"}
//     // Body: {"grant_type": "personal_access_token", "client_id": "your_client_id", "client_secret": "your_client_secret", "scope": "merchant", "personal_access_token": "your_personal_access_token"}

//     const response = await axios.post(
//       "v5/auth/connect/token",
//       {
//         grant_type: "personal_access_token",
//         client_id: process.env.BOOKER_CLIENT_ID,
//         client_secret: process.env.BOOKER_CLIENT_SECRET,
//         scope: "merchant",
//         personal_access_token: process.env.BOOKER_PERSONAL_ACCESS_TOKEN,
//       },
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
//         },
//       }
//     );
//     return response.data.access_token;
//   } catch (error) {
//     console.error("Error generating access token:", error);
//     throw error;
//   }
// };

// Cached access token to avoid requesting a new token on every call.
// This implements a simple sliding-refresh strategy: when the token is
// close to expiry (within TOKEN_REFRESH_BUFFER_MS) the function will
// request a fresh token. Concurrent callers will share the same
// in-flight request to avoid duplicate token calls.
interface CachedToken {
  token: string;
  expiry: number; // sliding expiry (epoch ms)
}

let cachedToken: CachedToken | null = null;
let tokenRequestPromise: Promise<string> | null = null;

// Configurable sliding and absolute windows. Environment variables may be
// provided to override defaults.
const SLIDING_WINDOW_MS =
  (process.env.BOOKER_SLIDING_MINUTES
    ? Number(process.env.BOOKER_SLIDING_MINUTES)
    : 30) *
  60 *
  1000; // default 30 minutes

// Refresh buffer is relative to sliding window but capped (safety margin).
const TOKEN_REFRESH_BUFFER_MS = Math.min(
  60 * 1000,
  Math.floor(SLIDING_WINDOW_MS * 0.2),
);

const generateAccessToken = async (): Promise<string> => {
  // If we have a cached token and it's not about to expire, return it.
  if (
    cachedToken &&
    Date.now() + TOKEN_REFRESH_BUFFER_MS < cachedToken.expiry
  ) {
    return cachedToken.token;
  }

  // If a token request is already in-flight, return the same promise so
  // concurrent callers wait for the same request.
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  // Create a new in-flight request
  tokenRequestPromise = (async () => {
    try {
      const response = await axios.post(
        "v5/auth/connect/token",
        {
          grant_type: "personal_access_token",
          client_id: process.env.BOOKER_CLIENT_ID,
          client_secret: process.env.BOOKER_CLIENT_SECRET,
          scope: "merchant",
          personal_access_token: process.env.BOOKER_PERSONAL_ACCESS_TOKEN,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
          },
        },
      );

      const token = response.data.access_token;
      // Many token endpoints return expires_in (seconds) which commonly
      // indicates the inactivity/sliding window. If absent, fall back to
      // our configured SLIDING_WINDOW_MS.
      const expiresIn = Number(response.data.expires_in);
      const slidingExpiry = expiresIn
        ? Date.now() + expiresIn * 1000
        : Date.now() + SLIDING_WINDOW_MS;

      // Initialize sliding expiry from server-provided expires_in when
      // available, otherwise use configured sliding window.
      cachedToken = { token, expiry: slidingExpiry };

      return token;
    } catch (error) {
      // Clear cached token on error so future calls will retry.
      cachedToken = null;
      console.error("Error generating access token:", error);
      throw error;
    } finally {
      // Clear the in-flight marker whether success or failure so subsequent
      // calls can trigger a new attempt if needed.
      tokenRequestPromise = null;
    }
  })();

  return tokenRequestPromise;
};

// Returns a valid access token for making a request and updates the
// sliding expiry on each successful use so the token life is extended
// by SLIDING_WINDOW_MS (capped by absoluteExpiry).
const getAccessToken = async (): Promise<string> => {
  const token = await generateAccessToken();
  if (cachedToken) {
    // Extend sliding expiry on use.
    cachedToken.expiry = Date.now() + SLIDING_WINDOW_MS;
  }
  return token;
};

// Remove global accessToken, generate per function
export const locationID = process.env.LOCATION_ID; // 46929 - Production, 3749 - Dev

export const findEmployees = async () => {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/employees",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );
    // console.log("Employees fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error finding employees:", error);
    throw error;
  }
};

export const findTreatments = async () => {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/treatments",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error finding treatments:", error);
    throw error;
  }
};

export const findRooms = async () => {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/rooms",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error finding rooms:", error);
    throw error;
  }
};

export const findAvailableDates = async (options: {
  fromDate: string;
  toDate: string;
  treatmentName?: string;
  employeeId?: number;
}) => {
  try {
    const accessToken = await getAccessToken();

    // Build query parameters
    const params = new URLSearchParams();
    params.append("locationIds", locationID?.toString() || "");
    params.append("fromDate", convert24toISO("00:00", options.fromDate));
    params.append("toDate", dateToISO(options.toDate));

    if (options.employeeId) {
      params.append("employeeId", options.employeeId.toString());
    }

    if (options.treatmentName) {
      const treatment = await treatmentLookupByName(options.treatmentName);
      if (treatment && treatment.ID) {
        params.append("serviceId", treatment.ID.toString());
      }
    }

    const response = await axios.get(
      `/v5/realtime_availability/AvailableDates?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_AVAILABILITY_KEY,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error finding available dates", error);
    throw error;
  }
};

export const findAvailableTimes = async (options: {
  date: string;
  time: string;
  treatmentName: string;
  employeeId?: number;
}) => {
  try {
    const accessToken = await getAccessToken();

    // Build query parameters
    const params = new URLSearchParams();
    params.append("LocationId", locationID?.toString() || "");
    params.append("fromDateTime", convert24toISO(options.time, options.date));

    const treatment = await treatmentLookupByName(options.treatmentName);
    if (treatment && treatment.ID) {
      params.append("serviceId[]", treatment.ID.toString());
    }

    params.append("IncludeEmployees", "true");
    if (options.employeeId) {
      params.append("employeeId", options.employeeId.toString());
    }

    const response = await axios.get(
      `/v5/realtime_availability/availability/1day/?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_AVAILABILITY_KEY,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error finding available dates", error);
    throw error;
  }
};

export const checkCustomerExists = async (firstName: string, phone: string) => {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/customers",
      {
        access_token: accessToken,
        LocationID: locationID,
        Phone: phone,
        FirstNameStart: firstName,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );
    return response.data.Customers && response.data.Customers.length > 0
      ? response.data.Customers[0]
      : null;
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

// NOTE: fix this, very prone to errors
export const createAppointment = async (
  appointment: AgentAppointment,
): Promise<CreateAppointmentResponse> => {
  const cleanPhone = (input: string): string | null => {
    const digits = input.replace(/\D/g, ""); // remove non-digits

    // If it includes country code, keep last 10 digits
    if (digits.length >= 10) {
      return digits.slice(-10);
    }

    return null; // invalid phone number
  };

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(appointment.appointmentDate)) {
    return {
      IsSuccess: false,
      ErrorMessage: `Invalid date format '${appointment.appointmentDate}'. Please use YYYY-MM-DD format (e.g., 2026-01-25).`,
      Appointment: undefined,
    };
  }

  // Validate the date is actually valid
  const appointmentDate = new Date(appointment.appointmentDate);
  if (isNaN(appointmentDate.getTime())) {
    return {
      IsSuccess: false,
      ErrorMessage: `Invalid date '${appointment.appointmentDate}'. Please provide a valid calendar date.`,
      Appointment: undefined,
    };
  }

  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appointmentDate.setHours(0, 0, 0, 0);
  if (appointmentDate < today) {
    return {
      IsSuccess: false,
      ErrorMessage: `Cannot book appointment in the past. Date '${appointment.appointmentDate}' has already passed.`,
      Appointment: undefined,
    };
  }

  // Validate time format (HH:MM in 24-hour format)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(appointment.startTime)) {
    return {
      IsSuccess: false,
      ErrorMessage: `Invalid time format '${appointment.startTime}'. Please use 24-hour format HH:MM (e.g., 14:30 for 2:30 PM).`,
      Appointment: undefined,
    };
  }

  // Validate phone number
  const cleanedPhone = cleanPhone(appointment.phone.toString());
  if (!cleanedPhone) {
    return {
      IsSuccess: false,
      ErrorMessage: `Invalid phone number '${appointment.phone}'. Please provide a valid 10-digit phone number.`,
      Appointment: undefined,
    };
  }

  // Lookup treatment and validate it exists
  const treatment = await treatmentLookupByName(appointment.treatmentName);
  if (!treatment || !treatment.ID) {
    return {
      IsSuccess: false,
      ErrorMessage: `Treatment '${appointment.treatmentName}' not found in our system. Please check the treatment name and try again.`,
      Appointment: undefined,
    };
  }

  const treatmentID = treatment.ID;

  // Get room for treatment
  const treatmentDoc = await TreatmentModel.findOne({ ID: treatmentID });
  if (
    !treatmentDoc ||
    !treatmentDoc.RoomIDs ||
    treatmentDoc.RoomIDs.length === 0
  ) {
    return {
      IsSuccess: false,
      ErrorMessage: `No rooms configured for treatment '${appointment.treatmentName}'. Please contact support.`,
      Appointment: undefined,
    };
  }
  const roomID = treatmentDoc.RoomIDs[0];

  const getEmployeeId = async (name: string): Promise<number | null> => {
    const employee = await employeeLookupByName(name);
    return employee ? employee.ID : null;
  };

  // If employee name is provided, validate it exists
  if (appointment.employeeName) {
    const employeeExists = await getEmployeeId(appointment.employeeName);
    if (!employeeExists) {
      return {
        IsSuccess: false,
        ErrorMessage: `Employee '${appointment.employeeName}' not found in our system. Please check the employee name and try again.`,
        Appointment: undefined,
      };
    }
  }

  const checkTimeSlotAvailability = (
    availabilityData: any[],
    requestedTime: string,
    requestedDate: string,
    serviceDuration: number,
    employeeId?: number,
  ): boolean => {
    try {
      const requestedStart = new Date(
        convert24toISO(requestedTime, requestedDate),
      );
      const requestedEnd = new Date(
        requestedStart.getTime() + serviceDuration * 60 * 1000,
      );

      console.log(
        `Checking time slot for ${requestedTime} on ${requestedDate}, duration: ${serviceDuration} min, employeeId: ${employeeId}`,
      );
      console.log(
        `Requested start: ${requestedStart.toISOString()}, Requested end: ${requestedEnd.toISOString()}`,
      );

      for (const location of availabilityData) {
        const interval = location.startTimeInterval ?? 15;
        console.log(`Location interval: ${interval}`);

        for (const category of location.serviceCategories ?? []) {
          for (const service of category.services ?? []) {
            console.log(
              `Checking service, availability blocks: ${service.availability?.length || 0}`,
            );
            for (const block of service.availability ?? []) {
              const blockStart = new Date(block.startDateTime);
              const blockEnd = new Date(block.endDateTime);

              console.log(
                `  Block: ${blockStart.toISOString()} to ${blockEnd.toISOString()}, employees: ${block.employees?.join(",") || "none"}`,
              );

              // Rule 1: requested start must be at or after block start
              if (requestedStart < blockStart) {
                console.log(
                  `    ❌ Rule 1 failed: requested start is before block start`,
                );
                continue;
              }

              // Rule 2: requested start must be before block end (service can extend beyond if needed)
              // We only need to ensure the appointment STARTS within the available window
              if (requestedStart >= blockEnd) {
                console.log(
                  `    ❌ Rule 2 failed: requested start is at or after block end`,
                );
                continue;
              }

              // Rule 3: start time must align to interval
              const minutesFromBlockStart = Math.round(
                (requestedStart.getTime() - blockStart.getTime()) / (1000 * 60),
              );

              if (minutesFromBlockStart % interval !== 0) {
                console.log(
                  `    ❌ Rule 3 failed: start time not aligned to ${interval} min interval (offset: ${minutesFromBlockStart} min)`,
                );
                continue;
              }

              // Rule 4: employee must be valid for this block
              if (
                employeeId &&
                (!block.employees || !block.employees.includes(employeeId))
              ) {
                console.log(
                  `    ❌ Rule 4 failed: employee ${employeeId} not in block employees`,
                );
                continue;
              }

              // ✅ Valid discrete timeslot
              console.log(`    ✅ Valid timeslot found!`);
              return true;
            }
          }
        }
      }

      console.log(`❌ No valid timeslot found`);
      return false;
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      return false;
    }
  };

  const determineEmployeeId = async (
    treatmentId: number,
  ): Promise<number | null> => {
    try {
      const treatment = await TreatmentModel.findOne({ ID: treatmentId });
      if (!treatment?.EmployeeIDs?.length) return null;

      console.log(
        `Checking availability for ${treatment.EmployeeIDs.length} employees for treatment ID ${treatmentId}`,
      );

      for (const empId of treatment.EmployeeIDs) {
        console.log(`Checking employee ID: ${empId}`);
        const availability = await findAvailableTimes({
          date: appointment.appointmentDate,
          time: appointment.startTime,
          treatmentName: appointment.treatmentName,
          employeeId: empId,
        });

        console.log(
          `Availability data for employee ${empId}:`,
          JSON.stringify(availability, null, 2),
        );

        if (!availability || !Array.isArray(availability)) {
          console.log(`No valid availability data for employee ${empId}`);
          continue;
        }

        const isAvailable = checkTimeSlotAvailability(
          availability,
          appointment.startTime,
          appointment.appointmentDate,
          treatment.TotalDuration || 40,
          empId,
        );

        console.log(
          `Employee ${empId} availability check result: ${isAvailable}`,
        );

        if (isAvailable) {
          return empId;
        }
      }

      return null;
    } catch (error) {
      console.error("Error determining employee ID:", error);
      return null;
    }
  };

  // Check if the date has any available times for this treatment
  try {
    const availableDates = await findAvailableDates({
      fromDate: appointment.appointmentDate,
      toDate: appointment.appointmentDate,
      treatmentName: appointment.treatmentName,
      employeeId: appointment.employeeName
        ? (await getEmployeeId(appointment.employeeName)) || undefined
        : undefined,
    });

    if (!availableDates || availableDates.length === 0) {
      return {
        IsSuccess: false,
        ErrorMessage: `No availability found for '${appointment.treatmentName}' on ${appointment.appointmentDate}. The business may be closed or fully booked on this date. Please choose a different date.`,
        Appointment: undefined,
      };
    }
  } catch (error) {
    console.error("Error checking available dates:", error);
  }

  const customer = await checkCustomerExists(
    appointment.firstName,
    cleanedPhone,
  );

  let sendSMS = true;

  if (customer) {
    const ccInfo = await getCustomerCreditCardInfo(customer.Customer.ID);
    if (ccInfo) {
      sendSMS = false;
    }
  }

  try {
    const accessToken = await getAccessToken();

    // Determine employee ID
    const employeeID = appointment.employeeName
      ? await getEmployeeId(appointment.employeeName)
      : await determineEmployeeId(treatmentID ?? 0);

    // Check if availability was found
    if (employeeID === null) {
      const errorResponse: CreateAppointmentResponse = {
        IsSuccess: false,
        ErrorMessage: appointment.employeeName
          ? `Employee '${appointment.employeeName}' is not available for '${appointment.treatmentName}' on ${appointment.appointmentDate} at ${appointment.startTime}. Please choose a different time or employee.`
          : `The requested time slot on ${appointment.appointmentDate} at ${appointment.startTime} is not available for '${appointment.treatmentName}'. No employees are available at this time. Please choose a different time or date.`,
        Appointment: undefined,
      };
      return errorResponse;
    }

    // Build the appointment request payload
    const appointmentPayload = {
      access_token: accessToken,
      LocationID: locationID,
      Notes: appointment.notes
        ? `Booked via YurrAI. Agent Notes: ${appointment.notes}`
        : "Booked via YurrAI",
      // CreateIncompleteAppointment: sendSMS,
      ResourceTypeID: 1,
      Customer: customer
        ? customer.Customer
        : {
            Email: appointment.email,
            MobilePhone: cleanPhone(appointment.phone.toString()),
            FirstName: appointment.firstName,
            LastName: appointment.lastName,
          },
      AppointmentDateOffset: convert24toISO(
        "00:00",
        appointment.appointmentDate,
      ),
      AppointmentTreatmentDTOs: [
        {
          TreatmentID: treatmentID,
          EmployeeID: employeeID,





          
          RoomID: roomID,
          EmployeeWasRequested: appointment.employeeName ? true : false,
          StartTimeOffset: convert24toISO(
            appointment.startTime,
            appointment.appointmentDate,
          ),
          EndTimeOffset: await determineEndTime(
            appointment.startTime,
            treatmentID || 0,
            appointment.appointmentDate,
          ),
        },
      ],
    };

    // Log the payload for debugging
    console.log(
      "Creating appointment with payload:",
      JSON.stringify(appointmentPayload, null, 2),
    );

    const response = await axios.post<CreateAppointmentResponse>(
      "/v4.1/merchant/appointment",
      appointmentPayload,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (sendSMS) {
      const appointmentObj = response.data?.Appointment;
      const customerId = appointmentObj?.Customer?.ID;
      if (typeof customerId === "number") {
        const widgetUrl = generateCCWidgetURL(customerId);
        const message = `Dear ${appointment.firstName}, your appointment for ${appointment.treatmentName} on ${appointment.appointmentDate} at ${appointment.startTime} has been created but requires a credit card on file. Please complete your booking by providing your payment details, using the following link: ${widgetUrl}.`;
        // Send SMS via phone
        sendMessage(appointment.phone.toString(), message).catch((error) => {
          console.error("Error sending SMS via phone:", error);
        });
      } else {
        // Missing appointment or customer ID - log and skip generating URL
        console.warn(
          "createAppointment: unable to generate CC widget URL, missing appointment/customer ID",
          {
            appointmentData: response.data,
          },
        );
      }
    } else {
      const message = `Dear ${appointment.firstName}, your appointment for ${appointment.treatmentName} on ${appointment.appointmentDate} at ${appointment.startTime} has been confirmed. We look forward to seeing you then!`;
      // Send SMS via phone
      sendMessage(appointment.phone.toString(), message).catch((error) => {
        console.error("Error sending SMS via phone:", error);
      });
    }

    return response.data;
  } catch (error: any) {
    console.error("Error creating appointment:", error);

    // Build a detailed error message based on the error type
    let errorMessage = "Failed to create appointment. ";

    // Check for Booker API validation errors
    if (error.response?.data?.ArgumentErrors) {
      const argumentErrors = error.response.data.ArgumentErrors;
      console.error(
        "Validation Errors:",
        JSON.stringify(argumentErrors, null, 2),
      );

      // Parse specific validation errors
      const errorDetails: string[] = [];
      for (const [field, messages] of Object.entries(argumentErrors)) {
        if (Array.isArray(messages)) {
          errorDetails.push(`${field}: ${messages.join(", ")}`);
        } else {
          errorDetails.push(`${field}: ${messages}`);
        }
      }

      if (errorDetails.length > 0) {
        errorMessage += `Validation errors: ${errorDetails.join("; ")}`;
      }
    }
    // Check for specific Booker API error messages
    else if (error.response?.data?.ErrorMessage) {
      errorMessage += error.response.data.ErrorMessage;
    }
    // Check for error code and message
    else if (error.response?.data?.ErrorCode) {
      errorMessage += `Error code ${error.response.data.ErrorCode}`;
      if (error.response.data.Message) {
        errorMessage += `: ${error.response.data.Message}`;
      }
    }
    // Network or other errors
    else if (error.message) {
      if (error.code === "ECONNREFUSED") {
        errorMessage +=
          "Unable to connect to booking service. Please try again later.";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage += "Request timed out. Please try again.";
      } else {
        errorMessage += error.message;
      }
    } else {
      errorMessage +=
        "An unknown error occurred. Please check the details and try again.";
    }

    if (error.response?.data) {
      console.error(
        "Full error response:",
        JSON.stringify(error.response.data, null, 2),
      );
    }

    // Return structured error response
    const errorResponse: CreateAppointmentResponse = {
      IsSuccess: false,
      ErrorMessage: errorMessage,
      Appointment: undefined,
    };

    return errorResponse;
  }
};

export const getCustomerCreditCardInfo = async (
  cusId: number,
): Promise<CreditCardRecord | null> => {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      "v4.1/merchant/customer/creditcards",
      {
        access_token: accessToken,

        CustomerID: cusId,
        SpaID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    const ccResponse: CreditCardResponse = response.data;

    return ccResponse.IsSuccess &&
      ccResponse.CreditCards &&
      ccResponse.CreditCards.length > 0
      ? ccResponse.CreditCards.find((card) => card.IsDefault) ||
          ccResponse.CreditCards[0]
      : null;
  } catch (error) {
    console.error("Error fetching customer credit cards:", error);
    throw error;
  }
};

export const generateCCWidgetURL = (customerId: number): string => {
  const baseUrl = process.env.PRODUCTION_URL || "http://localhost:3000";
  return `${baseUrl}/widget/cc-widget?customerId=${customerId}`;
};

export const getWidgetAuthToken = async (): Promise<string> => {
  try {
    const accessToken = await getAccessToken();
    console.log("Attempting to get widget auth token...");
    const response = await axios.get("v4.1/merchant/ccwidget/auth", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
      },
    });
    // console.log("Widget auth response:", response.data);
    const token =
      response.data.token ||
      response.data.access_token ||
      response.data.AccessToken;

    if (!token) {
      console.error("No token found in response:", response.data);
      throw new Error("Widget token not found in response");
    }

    return token;
  } catch (error: any) {
    console.error("Error getting widget auth token:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    throw error;
  }
};

export const getCustomerAppointments = async (options: {
  customerId: number;
  treatmentName?: string;
  date?: string;
  time?: string;
  onlyActive?: boolean;
  fromStartDate?: string;
  returnSingle?: boolean;
}): Promise<FullAppointmentObject | FullAppointmentObject[] | null> => {
  try {
    const accessToken = await getAccessToken();
    const onlyActive =
      options.onlyActive !== undefined ? options.onlyActive : true;

    // Build query parameters
    const params = new URLSearchParams();
    params.append("access_token", accessToken);
    params.append("only_active", onlyActive.toString());

    // If fromStartDate is provided, use it; otherwise use date if provided
    if (options.fromStartDate) {
      params.append(
        "fromStartDate",
        convert24toISO("00:00", options.fromStartDate),
      );
    } else if (options.date) {
      params.append("fromStartDate", convert24toISO("00:00", options.date));
    }

    const response = await axios.get(
      `/v4.1/merchant/customer/${options.customerId}/appointments?${params.toString()}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (
      !response.data.IsSuccess ||
      !response.data.Appointments ||
      response.data.Appointments.length === 0
    ) {
      return options.returnSingle ? null : [];
    }

    // Filter appointments based on provided criteria
    const appointments: FullAppointmentObject[] = response.data.Appointments;

    const filteredAppointments = appointments.filter((appointment) => {
      // If treatmentName is provided, check if treatment name matches
      if (options.treatmentName) {
        const treatmentMatch =
          appointment.TreatmentName?.toLowerCase().includes(
            options.treatmentName.toLowerCase(),
          );
        if (!treatmentMatch) return false;
      }

      // If date is provided, check if appointment date matches
      if (options.date && appointment.StartDateTimeOffset) {
        // StartDateTimeOffset is already in ISO format (e.g., "2025-11-15T14:00:00-04:00")
        const appointmentDate = appointment.StartDateTimeOffset.split("T")[0];
        const searchDate = options.date;
        if (appointmentDate !== searchDate) return false;
      }

      // If time is provided, check if appointment time matches
      if (options.time && options.date && appointment.StartDateTimeOffset) {
        // Convert input 24hr time to ISO format for comparison
        const searchTimeISO = convert24toISO(options.time, options.date);
        // Compare the datetime portion (without timezone)
        const appointmentDateTime = appointment.StartDateTimeOffset.substring(
          0,
          16,
        ); // "2025-11-15T14:00"
        const searchDateTime = searchTimeISO.substring(0, 16);
        if (!appointmentDateTime.startsWith(searchDateTime)) return false;
      }

      return true;
    });

    // Return based on returnSingle flag
    if (options.returnSingle) {
      return filteredAppointments.length > 0 ? filteredAppointments[0] : null;
    }

    return filteredAppointments;
  } catch (error) {
    console.error("Error getting customer appointments:", error);
    throw error;
  }
};

export const cancelAppointment = async (appointment: CancelAppointment) => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.put(
      "v4.1/merchant/appointment/cancel",
      {
        access_token: accessToken,
        ID: appointment.appointmentId,
        // ChargeNow: false,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error cancelling appointment:", error);
  }
};

export const addNotesToAppointment = async (
  appointment: AddAppointmentNotes,
) => {
  try {
    const accessToken = await generateAccessToken();

    const response = await axios.put(
      `v4.1/merchant/appointment/${appointment.appointmentId}/notes`,
      {
        access_token: accessToken,
        Notes: appointment.notes,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );
    return response.data;
  } catch (err) {
    console.error("Error adding notes to appointment:", err);
  }
};
