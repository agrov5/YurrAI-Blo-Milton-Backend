import axios from "axios";
import { Treatment, TreatmentModel } from "../models/Treatment";
import {
  getTreatmentIds,
  dateToISO,
  treatmentLookupByName,
  employeeLookupByName,
  determineEndTime,
  convert24toISO,
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
    const accessToken = await generateAccessToken();

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

export const checkCustomerExists = async (firstName: string, email: string) => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/customers",
      {
        access_token: accessToken,
        LocationID: locationID,
        Email: email,
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
            date: appointment.appointmentDate, // NOTE: Check this maybe it won't work.
            time: appointment.startTime,
            serviceId: treatmentId,
            employeeId: empId,
          }).then((availability) => {
            const avaliableEmployees: number[] = availability.serviceCategories[0].services[0].availabilty[0].employees
            const avaliable: boolean = avaliableEmployees.includes(empId);
            if (avaliable) {
              return empId;
            }
          });
        }
      } else {
        return null; // No employees associated with this treatment
      }
    });
  };

  const customer = await checkCustomerExists(
    appointment.firstName,
    appointment.email
  );

  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/appointment",
      {
        access_token: accessToken,
        LocationID: locationID,
        Notes: "Booked via YurrAI",
        // CreateIncompleteAppointment: true,
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
              : determineEmployeeId(treatmentID || 0),
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

    return response.data;
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};
