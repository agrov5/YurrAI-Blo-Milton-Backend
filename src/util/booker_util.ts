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
  AgentAppointment,
  CancelAppointment,
  CreateAppointmentResponse,
  FullAppointmentObject,
} from "../models/Appointment";
import { Employee } from "../models/Employee";
import { CreditCardResponse, CreditCardRecord } from "../models/CreditCard";
import { sendMessage } from "./twillo_util";
import { Customer } from "../models/Customer";

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
  Math.floor(SLIDING_WINDOW_MS * 0.2)
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
        }
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
      "/v4.1/customer/employees",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
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
      "/v4.1/customer/treatments",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
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
      "/v4.1/customer/rooms",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
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
  serviceId?: number;
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

    if (options.serviceId) {
      params.append("serviceId", options.serviceId.toString());
    }

    const response = await axios.get(
      `/v5/realtime_availability/AvailableDates?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_AVAILABILITY_KEY,
        },
      }
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
  serviceId: number;
  employeeId?: number;
}) => {
  try {
    const accessToken = await getAccessToken();

    // Build query parameters
    const params = new URLSearchParams();
    params.append("LocationId", locationID?.toString() || "");
    params.append("fromDateTime", convert24toISO(options.time, options.date));
    params.append("serviceId[]", options.serviceId.toString());
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
      }
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
      }
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
export const createAppointment = async ( // change to customer endpoint, make sure to change models as well. 
  appointment: AgentAppointment
): Promise<CreateAppointmentResponse> => {
  const treatmentID = await treatmentLookupByName(
    appointment.treatmentName
  ).then((treatment: Treatment | null) => {
    if (treatment) {
      return treatment.ID;
    } else {
      return 0;
    }
  });

  const roomID = await TreatmentModel.findOne({ ID: treatmentID }).then(
    (treatment) => {
      if (treatment && treatment.RoomIDs && treatment.RoomIDs.length > 0) {
        return treatment.RoomIDs[0];
      }
    }
  );

  const getEmployeeId = async (name: string): Promise<number | null> => {
    const employee = await employeeLookupByName(name);
    return employee ? employee.ID : null;
  };

  const checkTimeSlotAvailability = (
    availabilityData: any[],
    requestedTime: string,
    requestedDate: string
  ): boolean => {
    try {
      // Convert requested time to ISO format for comparison
      const requestedDateTime = new Date(
        convert24toISO(requestedTime, requestedDate)
      );

      for (const location of availabilityData) {
        const startTimeInterval = location.startTimeInterval || 15;

        for (const category of location.serviceCategories || []) {
          for (const service of category.services || []) {
            for (const availabilityBlock of service.availability || []) {
              const blockStart = new Date(availabilityBlock.startDateTime);
              const blockEnd = new Date(availabilityBlock.endDateTime);

              // Check if requested time falls within this availability block
              if (
                requestedDateTime >= blockStart &&
                requestedDateTime <= blockEnd
              ) {
                // Check if the time aligns with the location's start time interval
                const minutesSinceBlockStart =
                  (requestedDateTime.getTime() - blockStart.getTime()) /
                  (1000 * 60);

                // Verify the time slot aligns with the interval (e.g., 15, 30, 60 minutes)
                if (minutesSinceBlockStart % startTimeInterval === 0) {
                  return true;
                }
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      return false;
    }
  };

  const determineEmployeeId = async (
    treatmentId: number,
    customer: Customer | null
  ): Promise<number | null> => {
    try {
      const treatment = await TreatmentModel.findOne({ ID: treatmentId });
      if (
        treatment &&
        treatment.EmployeeIDs &&
        treatment.EmployeeIDs.length > 0
      ) {
        // Get preferred staff gender from customer if exists
        const preferredGenderId = customer?.PreferredStaffGender?.ID;

        // Check each employee for availability
        for (const empId of treatment.EmployeeIDs) {
          // If customer has a preferred gender, filter employees by gender first
          if (preferredGenderId) {
            const employeeDetails = await findEmployees();
            const employee = employeeDetails?.Results?.find(
              (emp: any) => emp.ID === empId
            );

            // Skip this employee if their gender doesn't match the customer's preference
            if (employee && employee.Gender?.ID !== preferredGenderId) {
              continue;
            }
          }

          const availability = await findAvailableTimes({
            date: appointment.appointmentDate,
            time: appointment.startTime,
            serviceId: treatmentId,
            employeeId: empId,
          });

          // Check if this employee has availability for the requested time
          if (availability && availability.length > 0) {
            const hasTimeSlot = checkTimeSlotAvailability(
              availability,
              appointment.startTime,
              appointment.appointmentDate
            );
            if (hasTimeSlot) {
              // Also check if the employee is listed in the availability block
              for (const location of availability) {
                for (const category of location.serviceCategories || []) {
                  for (const service of category.services || []) {
                    for (const block of service.availability || []) {
                      if (block.employees && block.employees.includes(empId)) {
                        return empId;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return null; // No available employees found
    } catch (error) {
      console.error("Error determining employee ID:", error);
      return null;
    }
  };

  const customer = await checkCustomerExists(
    appointment.firstName,
    appointment.phone.toString()
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
    const response = await axios.post<CreateAppointmentResponse>(
      "/v4.1/merchant/appointment",
      {
        access_token: accessToken,
        LocationID: locationID,
        Notes: appointment.notes
          ? `Booked via YurrAI. \n --- \n Agent Notes: ${appointment.notes}`
          : "Booked via YurrAI",
        // CreateIncompleteAppointment: sendSMS,
        ResourceTypeID: 1,
        Customer: customer
          ? customer.Customer
          : {
              Email: appointment.email,
              MobilePhone: appointment.phone,
              FirstName: appointment.firstName,
              LastName: appointment.lastName,
            },
        AppointmentDateOffset: convert24toISO(
          "00:00",
          appointment.appointmentDate
        ),
        AppointmentTreatmentDTOs: [
          {
            TreatmentID: treatmentID,
            EmployeeID: appointment.employeeName
              ? await getEmployeeId(appointment.employeeName)
              : await determineEmployeeId(treatmentID ?? 0, customer),
            RoomID: roomID,
            EmployeeWasRequested: appointment.employeeName ? true : false,
            StartTimeOffset: convert24toISO(
              appointment.startTime,
              appointment.appointmentDate
            ),
            EndTimeOffset: await determineEndTime(
              appointment.startTime,
              treatmentID || 0,
              appointment.appointmentDate
            ),
          },
        ],
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
    );

    if (sendSMS) {
      const appointmentObj = response.data?.Appointment;
      const customerId = appointmentObj?.Customer?.ID;
      if (typeof customerId === "number") {
        const widgetUrl = generateCCWidgetURL(customerId);
        const message = `Dear ${appointment.firstName}, your appointment for ${appointment.treatmentName} on ${appointment.appointmentDate} at ${appointment.startTime} has been created but requires a credit card on file. Please complete your booking by providing your payment details, using the following link: ${widgetUrl}.`;
        // Send SMS via Twilio
        sendMessage(appointment.phone.toString(), message).catch((error) => {
          console.error("Error sending SMS via Twilio:", error);
        });
      } else {
        // Missing appointment or customer ID - log and skip generating URL
        console.warn(
          "createAppointment: unable to generate CC widget URL, missing appointment/customer ID",
          {
            appointmentData: response.data,
          }
        );
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

export const getCustomerCreditCardInfo = async (
  cusId: number
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
      }
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
        convert24toISO("00:00", options.fromStartDate)
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
      }
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
            options.treatmentName.toLowerCase()
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
          16
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
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error cancelling appointment:", error);
  }
};
