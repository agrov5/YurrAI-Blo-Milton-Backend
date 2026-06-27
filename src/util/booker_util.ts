import axios from "axios";
import { Treatment, TreatmentModel } from "../models/Treatment";
import { generateWidgetToken } from "./widget_token_util";
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
  CleanAppointment,
  CreateAppointmentResponse,
  FullAppointmentObject,
} from "../models/Appointment";
import { Employee, EmployeeModel } from "../models/Employee";
import { CreditCardResponse, CreditCardRecord } from "../models/CreditCard";
import {
  sendMessageMMS,
  sendMessageSMS,
  sendMessageToAdmin,
} from "./phone_util";
import {
  Customer,
  ExistingCustomer,
  FindCustomersResponse,
} from "../models/Customer";
import { getTreatmentById } from "../controllers/getController";
import { ArgumentErrors } from "../models/Interfaces";
import {
  AppointmentPayment,
  PaymentItem,
  CreditCard,
} from "../models/Appointment";
import { Order } from "../models/Order";
import { convertISOtoFriendly } from "./db_util";
import { incrementBookerRequestCount } from "../models/MonthlyStats";

// Dedicated axios instance for all Booker API traffic. Using a separate client
// (instead of the global axios) keeps the request interceptor below scoped to
// Booker calls only — voip.ms and other axios usage are unaffected.
const bookerClient = axios.create({
  baseURL: process.env.AXIOS_BASE_URL,
});

// Every outgoing Booker request bumps the current month's counter. This is
// fire-and-forget: we never block (or fail) a Booker call on the stats write.
bookerClient.interceptors.request.use((requestConfig) => {
  incrementBookerRequestCount().catch((err) =>
    console.error("Failed to increment Booker request count:", err),
  );
  return requestConfig;
});

// const generateAccessToken = async () => {
//   try {
//     // Header: {"Content-Type": "application/x-www-form-urlencoded", "Ocp-Apim-Subscription-Key": "your_subscription_key"}
//     // Body: {"grant_type": "personal_access_token", "client_id": "your_client_id", "client_secret": "your_client_secret", "scope": "merchant", "personal_access_token": "your_personal_access_token"}

//     const response = await bookerClient.post(
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
      const response = await bookerClient.post(
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

// Helper function
export const cleanAppointment = (appointment: any) => ({
  appointmentId: appointment.ID,
  status: appointment.Status?.Name,
  startDateTime: convertISOtoFriendly(appointment.StartDateTimeOffset),
  endDateTime: convertISOtoFriendly(appointment.EndDateTimeOffset),
  startDateTimeISO: appointment.StartDateTimeOffset,
  endDateTimeISO: appointment.EndDateTimeOffset,
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

// Remove global accessToken, generate per function
export const locationID = process.env.LOCATION_ID; // 46929 - Production, 3749 - Dev

export const findEmployees = async () => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.post(
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
    const response = await bookerClient.post(
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
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error finding treatments:", error);
    throw error;
  }
};

export const findRooms = async () => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.post(
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

    const response = await bookerClient.get(
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
    // Query from start of day to get full day availability and catch existing bookings
    params.append("fromDateTime", convert24toISO("00:00", options.date));

    const treatment = await treatmentLookupByName(options.treatmentName);
    if (treatment && treatment.ID) {
      params.append("serviceId[]", treatment.ID.toString());
    }

    params.append("IncludeEmployees", "true");
    if (options.employeeId) {
      params.append("employeeId", options.employeeId.toString());
    }

    const response = await bookerClient.get(
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

export async function checkCustomerExists(
  phone: string,
  firstNameRequiredFlag: true,
  firstName?: string,
): Promise<ExistingCustomer | null>;
export async function checkCustomerExists(
  phone: string,
  firstNameRequiredFlag: false,
  firstName?: string,
): Promise<ExistingCustomer[] | null>;
export async function checkCustomerExists(
  phone: string,
  firstNameRequiredFlag = true,
  firstName?: string,
): Promise<ExistingCustomer | ExistingCustomer[] | null> {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.post(
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

    if (firstNameRequiredFlag) {
      return response.data.Customers && response.data.Customers.length > 0
        ? response.data.Customers[0]
        : null;
    } else {
      const customers: ExistingCustomer[] = response.data.Customers ?? [];
      return customers.length > 0 ? customers : null;
    }
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
}

export const generateCCWidgetURL = (customerId: number): string => {
  const baseUrl = process.env.PRODUCTION_URL || "http://localhost:3000";
  const token = generateWidgetToken(customerId, locationID || "0");
  return `${baseUrl}/widget/cc-widget?token=${encodeURIComponent(token)}`;
};

export const getCustomerCreditCardInfo = async (
  cusId: number,
): Promise<CreditCardRecord | null> => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.post(
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

export const findCustomerOrders = async (
  customerId: number,
  fromDateCreated?: string,
) => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.post(
      "/v4.1/merchant/orders",
      {
        access_token: accessToken,
        LocationID: locationID,
        CustomerID: customerId,
        // FromDateCreatedOffset: convert24toISO("00:00", fromDateCreated || new Date().toISOString().split("T")[0]),
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (!response.data.IsSuccess) {
      console.error(
        "Error fetching customer orders:",
        response.data.ErrorMessage,
      );
      return null;
    }

    return response.data.Results ?? [];
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    throw err;
  }
};

export const getOrder = async (orderId: number): Promise<Order | null> => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.get(
      `/v4.1/merchant/order/${orderId}?access_token=${accessToken}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (!response.data.IsSuccess) {
      console.error(
        "Error fetching order details:",
        response.data.ErrorMessage ||
          response.data.ArgumentErrors ||
          "Unknown error",
      );
    }

    return response.data.Order || null;
  } catch (err) {
    console.error("Error fetching order details:", err);
    return null;
  }
};

export const addPaymentToOrder = async (
  orderId: number,
  paymentItem: CreditCard | null,
) => {
  try {
    if (paymentItem === null) {
      console.warn(
        `No credit card info available, skipping addPaymentToOrder for order ID ${orderId}.`,
      );
      return null;
    }

    const accessToken = await getAccessToken();
    const order = await getOrder(orderId);
    const amount = order?.FinalTotal ?? null;

    const response = await bookerClient.post(
      `/v4.1/merchant/order/${orderId}/add_payment`,
      {
        access_token: accessToken,
        PaymentItem: {
          CreditCard: paymentItem,
          Amount: amount,
          Method: { Name: "Credit Card", ID: 1 },
        },
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (!response.data.IsSuccess) {
      console.error(
        "Error adding payment to order:",
        response.data.ErrorMessage,
      );
    }

    return response.data;
  } catch (err) {
    console.error("Error adding payment to order:", err);
    throw err;
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

  let namedEmployeeId: number | null = null;
  // If employee name is provided, validate it exists
  if (appointment.employeeName) {
    namedEmployeeId = await getEmployeeId(appointment.employeeName);
    if (!namedEmployeeId) {
      return {
        IsSuccess: false,
        ErrorMessage: `Employee '${appointment.employeeName}' not found in our system. Please check the employee name and try again.`,
        Appointment: undefined,
      };
    }
  }

  const parseBookerAvailabilityDateTime = (
    rawValue: string,
    requestedDate: string,
  ): Date | null => {
    if (!rawValue || typeof rawValue !== "string") {
      return null;
    }

    const normalized = rawValue.trim();
    if (normalized.includes("T")) {
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    const timeMatch = normalized.match(/^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();

    if (meridiem === "PM" && hour !== 12) {
      hour += 12;
    }
    if (meridiem === "AM" && hour === 12) {
      hour = 0;
    }

    const [year, month, day] = requestedDate.split("-").map(Number);
    const isoString =
      `${year.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}` +
      `T${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}:00-04:00`;

    const parsed = new Date(isoString);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const checkTimeSlotAvailability = async (
    availabilityData: any[],
    requestedTime: string,
    requestedDate: string,
    serviceDuration: number,
    employeeId?: string | number, // Changed to handle name strings or IDs from JSON
  ): Promise<boolean> => {
    try {
      const requestedStart = new Date(
        convert24toISO(requestedTime, requestedDate),
      );
      const requestedStartMs = requestedStart.getTime();

      console.log(`Checking: ${requestedTime} | Duration: ${serviceDuration}m`);

      let employeeNameCandidates: string[] = [];
      if (typeof employeeId === "number") {
        const employee = await EmployeeModel.findOne({ ID: employeeId }).exec();
        if (employee) {
          employeeNameCandidates = [
            employee.FullName,
            employee.DisplayName,
            `${employee.FirstName} ${employee.LastName ?? ""}`.trim(),
            ...(employee.AliasNames ?? []),
          ]
            .map((name) => (name == null ? null : name.toString().trim()))
            .filter((name): name is string => Boolean(name));
        }
      }

      for (const location of availabilityData) {
        for (const category of location.serviceCategories ?? []) {
          for (const service of category.services ?? []) {
            const blocks = [
              ...(service.availability ?? []),
              ...(service.callToBookAvailability ?? []),
              ...(service.callToBookAvaiability ?? []),
            ];

            for (const block of blocks) {
              const blockStart = parseBookerAvailabilityDateTime(
                block.startDateTime,
                requestedDate,
              );
              const blockEnd = parseBookerAvailabilityDateTime(
                block.endDateTime,
                requestedDate,
              );
              if (!blockStart || !blockEnd) {
                continue;
              }

              const slotStepMs = 15 * 60 * 1000;
              const startWindowMs = blockStart.getTime();
              const endWindowMs = blockEnd.getTime();

              // Booker returns availability as a block of 15-minute booking
              // intervals. Treat startDateTime as the first allowable booking
              // start, endDateTime as the last allowable booking start, and
              // allow any 15-minute-aligned start within that window.
              const totalBlockMinutes =
                (endWindowMs - startWindowMs) / 60 / 1000;
              const slotCount = Math.floor(totalBlockMinutes / 15) + 1;
              const is15MinuteAlignedStart = Array.from(
                { length: slotCount },
                (_, index) => startWindowMs + index * slotStepMs,
              ).includes(requestedStartMs);

              if (!is15MinuteAlignedStart) {
                continue;
              }

              console.log(
                `✅ Requested time slot fits within available block.`,
              );

              if (employeeId) {
                const availableEmployees = Array.isArray(block.employees)
                  ? block.employees
                  : [];

                const isEmployeeAvailable = availableEmployees.some(
                  (emp: any) => {
                    if (typeof employeeId === "number") {
                      if (typeof emp === "number" && emp === employeeId) {
                        return true;
                      }

                      const empText = emp?.toString().trim();
                      if (!empText) {
                        return false;
                      }

                      if (/^\d+$/.test(empText)) {
                        return Number(empText) === employeeId;
                      }

                      return employeeNameCandidates.some(
                        (name) => name.toLowerCase() === empText.toLowerCase(),
                      );
                    }

                    return (
                      emp?.toString().trim().toLowerCase() ===
                      employeeId.toString().trim().toLowerCase()
                    );
                  },
                );

                if (!isEmployeeAvailable) {
                  console.log(
                    `❌ Rule 3 failed: Employee ${employeeId} not in block`,
                  );
                  continue;
                }
              }

              console.log(`✅ Valid timeslot found!`);
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

      const results = await Promise.all(
        treatment.EmployeeIDs.map(async (empId) => {
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
            return null;
          }

          const isAvailable = await checkTimeSlotAvailability(
            availability,
            appointment.startTime,
            appointment.appointmentDate,
            treatment.TotalDuration || 40,
            empId,
          );

          console.log(
            `Employee ${empId} availability check result: ${isAvailable}`,
          );

          return isAvailable ? empId : null;
        }),
      );

      return results.find((id) => id !== null) ?? null;
    } catch (error) {
      console.error("Error determining employee ID:", error);
      return null;
    }
  };

  // Check availability and customer existence in parallel
  const [availableDates, customer] = await Promise.all([
    findAvailableDates({
      fromDate: appointment.appointmentDate,
      toDate: appointment.appointmentDate,
      treatmentName: appointment.treatmentName,
      employeeId: namedEmployeeId || undefined,
    }),
    checkCustomerExists(cleanedPhone, true, appointment.firstName),
  ]);

  if (!availableDates || availableDates.length === 0) {
    return {
      IsSuccess: false,
      ErrorMessage: `No availability found for '${appointment.treatmentName}' on ${appointment.appointmentDate}. The business may be closed or fully booked on this date. Please choose a different date.`,
      Appointment: undefined,
    };
  }

  let sendSMS = true;
  let ccInfo: CreditCardRecord | null = null;

  if (customer?.CustomerID) {
    const [existingAppointments, fetchedCcInfo] = await Promise.all([
      getCustomerAppointments({
        customerId: customer.CustomerID,
        fromStartDate: appointment.appointmentDate,
      }),
      getCustomerCreditCardInfo(customer.Customer?.ID || 0),
    ]);

    ccInfo = fetchedCcInfo;
    if (ccInfo) {
      sendSMS = false;
    }

    // Check for overlapping appointments
    // const newStart = new Date(
    //   convert24toISO(appointment.startTime, appointment.appointmentDate),
    // );
    // const newEnd = new Date(
    //   await determineEndTime(
    //     appointment.startTime,
    //     treatmentID || 0,
    //     appointment.appointmentDate,
    //   ),
    // );

    // const hasOverlappingAppointment = Array.isArray(existingAppointments)
    //   ? existingAppointments.some((existingAppointment) => {
    //       if (existingAppointment.Status?.Name?.toLowerCase() !== "booked")
    //         return false;
    //       if (
    //         !existingAppointment.StartDateTimeOffset ||
    //         !existingAppointment.EndDateTimeOffset
    //       )
    //         return false;

    //       const existingStart = new Date(
    //         existingAppointment.StartDateTimeOffset,
    //       );
    //       const existingEnd = new Date(existingAppointment.EndDateTimeOffset);

    //       // Check for overlap: intervals [newStart, newEnd) and [existingStart, existingEnd) overlap if max(start) < min(end)
    //       const overlap =
    //         Math.max(newStart.getTime(), existingStart.getTime()) <
    //         Math.min(newEnd.getTime(), existingEnd.getTime());
    //       return overlap;
    //     })
    //   : false;

    // if (hasOverlappingAppointment) {
    //   return {
    //     IsSuccess: false,
    //     ErrorMessage: `${appointment.firstName} already has an overlapping appointment on ${appointment.appointmentDate}. Please choose a different time.`,
    //     Appointment: undefined,
    //   };
    // }
  }

  try {
    const accessToken = await getAccessToken();

    // Determine employee ID
    let employeeID: number | null = null;

    if (namedEmployeeId !== null) {
      const availability = await findAvailableTimes({
        date: appointment.appointmentDate,
        time: appointment.startTime,
        treatmentName: appointment.treatmentName,
        employeeId: namedEmployeeId,
      });

      const isAvailable =
        availability && Array.isArray(availability)
          ? await checkTimeSlotAvailability(
              availability,
              appointment.startTime,
              appointment.appointmentDate,
              treatmentDoc?.TotalDuration || 40,
              namedEmployeeId,
            )
          : false;

      employeeID = isAvailable ? namedEmployeeId : null;
    } else {
      employeeID = await determineEmployeeId(treatmentID ?? 0);
    }

    // Check if availability was found
    if (employeeID === null) {
      const errorResponse: CreateAppointmentResponse = {
        IsSuccess: false,
        ErrorMessage: appointment.employeeName
          ? `${appointment.employeeName} is not available for '${appointment.treatmentName}' on ${appointment.appointmentDate} at ${appointment.startTime}. Please choose a different time or a different employee.`
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
      // CreateIncompleteAppointment: sendSMS ? true : false,
      ResourceTypeID: 1,
      Customer: customer
        ? customer.Customer
        : {
            Email: appointment.email,
            MobilePhone: cleanPhone(appointment.phone.toString()),
            FirstName: appointment.firstName,
            LastName: appointment.lastName,
            AllowReceiveSMS: true,
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

    let cardOnFile = sendSMS ? false : true;

    const response = await bookerClient.post<CreateAppointmentResponse>(
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
        sendMessageMMS(appointment.phone.toString(), message).catch((error) => {
          console.error("Error sending SMS via phone:", error);
        });
        // Send SMS to Admin saying payment on appointment missing. 
        sendMessageToAdmin(
          `${appointment.firstName} ${appointment.lastName[0]}. (${cleanPhone(appointment.phone.toString())}) has booked ${appointment.treatmentName} on ${appointment.appointmentDate} @ ${appointment.startTime} (PayMis)`,
          "SMS",
        );
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
      const message = `Dear ${appointment.firstName}, your appointment on ${appointment.appointmentDate} at ${appointment.startTime} has been booked. We look forward to seeing you then!`;
      // Send SMS via phone
      sendMessageSMS(appointment.phone.toString(), message).catch((error) => {
        console.error("Error sending SMS via phone:", error);
      });

      // Add Payment to Order — fire-and-forget, don't block the response
      Promise.resolve()
        .then(async () => {
          const order = await findCustomerOrders(customer?.CustomerID || 0);
          if (order && order.length > 0) {
            await addPaymentToOrder(order[0].ID, ccInfo?.CreditCard || null);
          } else {
            console.warn(
              `No order found for customer ID ${customer?.CustomerID}, unable to add payment to order.`,
            );
          }
        })
        .catch((err) =>
          console.error("Error in post-booking payment step:", err),
        );
    }

    return {
      ...response.data,
      cardOnFile: cardOnFile,
    };
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
      cardOnFile: false,
    };

    return errorResponse;
  }
};

export const getWidgetAuthToken = async (): Promise<string> => {
  try {
    const accessToken = await getAccessToken();
    console.log("Attempting to get widget auth token...");
    const response = await bookerClient.get("v4.1/merchant/ccwidget/auth", {
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

    const response = await bookerClient.get(
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

export const getAppointmentById = async (
  appointmentId: number,
  // clean?: boolean,
): Promise<CleanAppointment | null> => {
  try {
    const accessToken = await getAccessToken();
    const response = await bookerClient.get(
      `/v4.1/merchant/appointment/${appointmentId}?access_token=${accessToken}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    if (!response.data.IsSuccess || !response.data.Appointment) {
      return null;
    }

    return cleanAppointment(response.data.Appointment);
  } catch (error) {
    console.error("Error getting appointment by ID:", error);
    throw error;
  }
};

export const cancelAppointment = async (
  appointment: CancelAppointment,
): Promise<CreateAppointmentResponse> => {
  try {
    const accessToken = await generateAccessToken();
    const response = await bookerClient.put(
      "v4.1/merchant/appointment/cancel",
      {
        access_token: accessToken,
        ID: appointment.appointmentId,
        // ChargeNow: false, // Only charge if the appointment is being cancelled within the 24hrs.
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      },
    );

    return {
      ...response.data,
      Appointment: response.data.Appointment,
    };
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return {
      IsSuccess: false,
      ErrorMessage: "Failed to cancel appointment. Please try again later.",
      Appointment: undefined,
    };
  }
};

export const addNotesToAppointment = async (
  appointment: AddAppointmentNotes,
) => {
  try {
    const accessToken = await generateAccessToken();

    const response = await bookerClient.put(
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
