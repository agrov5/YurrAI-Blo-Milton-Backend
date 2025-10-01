import axios from "axios";
import { Treatment, TreatmentModel } from "../models/Treatment";
import {
  getTreatmentIds,
  dateToISO,
  treatmentLookupByName,
  employeeLookupByName,
} from "./db_util";
import { saveAsJson, saveAsJsonAsync } from "../middlewares/loggerMiddleware";
import { AgentAppointment } from "../models/Appointment";
import { Employee } from "../models/Employee";

const generateAccessToken = async () => {
  try {
    // Header: {"Content-Type": "application/x-www-form-urlencoded", "Ocp-Apim-Subscription-Key": "your_subscription_key"}
    // Body: {"grant_type": "personal_access_token", "client_id": "your_client_id", "client_secret": "your_client_secret", "scope": "merchant", "personal_access_token": "your_personal_access_token"}

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
    return response.data.access_token;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw error;
  }
};

// Remove global accessToken, generate per function
export const locationID = process.env.LOCATION_ID; // 46929 - Production, 3749 - Dev

export const findEmployees = async () => {
  try {
    const accessToken = await generateAccessToken();
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
    const accessToken = await generateAccessToken();
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
    const accessToken = await generateAccessToken();
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
    const accessToken = await generateAccessToken();

    // Build query parameters
    const params = new URLSearchParams();
    params.append("locationIds", locationID?.toString() || "");
    params.append("fromDate", dateToISO(options.fromDate));
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
  fromDateTime: string;
  serviceId: number;
  employeeId?: number;
}) => {
  try {
    const accessToken = await generateAccessToken();

    // Build query parameters
    const params = new URLSearchParams();
    params.append("LocationIds", locationID?.toString() || "");
    params.append("fromDateTime", options.fromDateTime);
    params.append("serviceId", options.serviceId.toString());

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

// NOTE: fix this, very prone to errors
export const createAppointment = async (appointment: AgentAppointment) => {
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

  const determineEmployeeId = (treatmentId: number) => {
    TreatmentModel.findOne({ ID: treatmentId }).then((treatment) => {
      if (
        treatment &&
        treatment.EmployeeIDs &&
        treatment.EmployeeIDs.length > 0
      ) {
        for (const empId of treatment.EmployeeIDs) {
          findAvailableTimes({
            fromDateTime: appointment.appointmentDate, // NOTE: Check this maybe it won't work.
            serviceId: treatmentId,
            employeeId: empId,
          }).then((availability) => {
            if (availability && availability.length > 0) {
              return empId;
            }
          });
        }
      } else {
        return null; // No employees associated with this treatment
      }
    });
  };

  const determineEndTime = async (
    startTime: string,
    treatmentId: number,
    appointmentDate: string
  ) => {
    const endTimeISO = await TreatmentModel.findOne({ ID: treatmentId }).then(
      (treatment) => {
        const [startHour, startMinute] = startTime.split(":").map(Number);
        let totalMinutes: number;

        if (treatment && treatment.TotalDuration) {
          totalMinutes = treatment.TotalDuration;
        } else {
          // Fallback to 2 hours (120 minutes)
          totalMinutes = 120;
        }

        const endHour =
          startHour + Math.floor((startMinute + totalMinutes) / 60);
        const endMinute = (startMinute + totalMinutes) % 60;

        // Parse the date string more explicitly to avoid timezone issues
        const [year, month, day] = appointmentDate.split("-").map(Number);
        const date = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

        // Format to ISO string with fixed timezone offset (-04:00)
        const isoString =
          date.getFullYear() +
          "-" +
          String(date.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(date.getDate()).padStart(2, "0") +
          "T" +
          String(date.getHours()).padStart(2, "0") +
          ":" +
          String(date.getMinutes()).padStart(2, "0") +
          ":" +
          String(date.getSeconds()).padStart(2, "0") +
          "-04:00";

        return isoString;
      }
    );

    console.log("Determined end time:", endTimeISO);
    return endTimeISO;
  };
  const convert24toISO = (time24: string, appointmentDate: string) => {
    const [hours, minutes] = time24.split(":").map(Number);

    // Parse the date string more explicitly to avoid timezone issues
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // Format to ISO string with fixed timezone offset (-04:00)
    const isoString =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0") +
      "T" +
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0") +
      ":" +
      String(date.getSeconds()).padStart(2, "0") +
      "-04:00";

    console.log("Converted time to ISO:", isoString);
    return isoString;
  };

  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/appointment",
      {
        access_token: accessToken,
        LocationID: locationID,
        Notes: "Booked via YurrAI",
        ResourceTypeID: 1,
        Customer: {
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
              : determineEmployeeId(treatmentID || 0),
            RoomID: roomID,
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

    return response.data;
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

// AppointmentDateOffset
// LocationID
// access_token
// AppointmentTreatmentDTOs
