/* eslint-disable prettier/prettier */
import { EmployeeModel, Employee, IEmployee } from "../models/Employee";
import { TreatmentModel } from "../models/Treatment";

export const customerLookup = (cusId: number) => {};

export const employeeLookup = async (empId: number) => {
  const employee = await EmployeeModel.findOne({ id: empId }).exec();
  return employee;
};

export const employeeLookupByName = async (name: string) => {
  const employee = await EmployeeModel.findOne({ FullName: name }).exec();
  return employee;
};

export const treatmentLookup = (treatId: number) => {
  const treatment = TreatmentModel.findOne({ id: treatId }).exec();
  return treatment;
};

export const treatmentLookupByName = async (name: string) => {
  const treatment = await TreatmentModel.findOne({
    TreatmentName: name,
  }).exec();
  return treatment;
};

export const getTreatmentIds = async () => {
  const treatments = await TreatmentModel.find().exec();
  return treatments.map((treatment) => treatment.id);
};

export const sortEmployeeIdsInTreatementsByRank = async () => {
  const employees: IEmployee[] = await EmployeeModel.find().exec();
  const treatments = await TreatmentModel.find().exec();

  for (const treatment of treatments) {
    if (treatment.EmployeeIDs && treatment.EmployeeIDs.length > 0) {
      treatment.EmployeeIDs.sort((a, b) => {
        const empA = employees.find((emp) => emp.ID === a);
        const empB = employees.find((emp) => emp.ID === b);
        const rankA = empA && empA.Rank ? empA.Rank : Number.MAX_SAFE_INTEGER;
        const rankB = empB && empB.Rank ? empB.Rank : Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      });
      await treatment.save();
    }
  }
};

/**
 * Converts yyyy-mm-dd format to ISO string format (yyyy-mm-ddT00:00:00.000Z)
 * @param dateStr - Date string in yyyy-mm-dd format (e.g., "2025-09-28")
 * @returns ISO string format (e.g., "2025-09-28T00:00:00.000Z")
 */
export const dateToISO = (dateStr: string): string => {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("Invalid date format. Expected yyyy-mm-dd format.");
  }

  const date = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }

  return date.toISOString();
};

/**
 * Converts ISO string format to yyyy-mm-dd format
 * @param isoStr - ISO string format (e.g., "2025-09-28T14:30:00.000Z")
 * @returns Date string in yyyy-mm-dd format (e.g., "2025-09-28")
 */
export const isoToDate = (isoStr: string): string => {
  const date = new Date(isoStr);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid ISO date string.");
  }

  return date.toISOString().split("T")[0];
};

export const determineEndTime = async (
  startTime: string,
  treatmentId: number,
  appointmentDate: string,
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

      const endHour = startHour + Math.floor((startMinute + totalMinutes) / 60);
      const endMinute = (startMinute + totalMinutes) % 60;

      // Parse the date string more explicitly to avoid timezone issues
      const [year, month, day] = appointmentDate.split("-").map(Number);
      const date = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

      // Format to ISO string with fixed timezone offset (-04:00 for EDT)
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
    },
  );

  return endTimeISO;
};

export const convert24toISO = (time24: string, appointmentDate: string) => {
  const [hours, minutes] = time24.split(":").map(Number);

  // Parse the date string more explicitly to avoid timezone issues
  const [year, month, day] = appointmentDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Format to ISO string with fixed timezone offset (-04:00 for EDT)
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
};

export const convertISOtoFriendly = (isoStr: string) => {
  const date = new Date(isoStr);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long", // Full name of the weekday (e.g., "Friday")
    year: "numeric",
    month: "long", // Full name of the month (e.g., "January")
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false, // Use 12-hour clock (e.g., 4 PM)
    timeZone: "America/New_York",
  };

  const friendlyDate = date.toLocaleString("en-US", options);
  return friendlyDate;
};

export function convertToMMDD(dateStr: string): string {
  // Remove " at" so the native Date constructor can parse it correctly
  const cleanString = dateStr.replace(/\s+at\s+/i, " ");
  const date = new Date(cleanString);

  // Check for invalid date inputs
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format provided.");
  }

  // Extract and pad month (0-11, so add 1) and day
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}/${day}`;
}

const ISO_DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const TIME_FIELD_REGEX = /(time|start|end|from|to)/i;

export const ISOToFriendlyTime = (isoStr: string): string => {
  if (!isoStr || !ISO_DATE_TIME_REGEX.test(isoStr)) {
    return isoStr;
  }

  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    return isoStr;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
};

export const convertISOTimeFieldsToFriendlyTime = <T>(value: T): T => {
  const convertValue = (input: unknown, parentKey?: string): unknown => {
    if (typeof input === "string") {
      if (!parentKey || !TIME_FIELD_REGEX.test(parentKey)) {
        return input;
      }
      return ISOToFriendlyTime(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => convertValue(item, parentKey));
    }

    if (input && typeof input === "object") {
      return Object.entries(input as Record<string, unknown>).reduce(
        (accumulator, [key, nestedValue]) => {
          accumulator[key] = convertValue(nestedValue, key);
          return accumulator;
        },
        {} as Record<string, unknown>,
      );
    }

    return input;
  };

  return convertValue(value) as T;
};

export const convertBookerAvailabilityToFriendlyTime = <T>(
  availabilityPayload: T,
): T => {
  if (!Array.isArray(availabilityPayload)) {
    return availabilityPayload;
  }

  return availabilityPayload.map((location: any) => ({
    ...location,
    locationHours: Array.isArray(location.locationHours)
      ? location.locationHours.map((hours: any) => ({
          ...hours,
          open: ISOToFriendlyTime(hours.open),
          close: ISOToFriendlyTime(hours.close),
        }))
      : location.locationHours,
    serviceCategories: Array.isArray(location.serviceCategories)
      ? location.serviceCategories.map((category: any) => ({
          ...category,
          services: Array.isArray(category.services)
            ? category.services.map((service: any) => ({
                ...service,
                availability: Array.isArray(service.availability)
                  ? service.availability.map((slot: any) => ({
                      ...slot,
                      startDateTime: ISOToFriendlyTime(slot.startDateTime),
                      endDateTime: ISOToFriendlyTime(slot.endDateTime),
                    }))
                  : service.availability,
              }))
            : category.services,
        }))
      : location.serviceCategories,
  })) as T;
};

export const convertBookerAvailabilityEmployeeIdsToNames = async <T>(
  availabilityPayload: T,
): Promise<T> => {
  if (!Array.isArray(availabilityPayload)) {
    return availabilityPayload;
  }

  const employeeIds = new Set<number>();

  for (const location of availabilityPayload as any[]) {
    if (!Array.isArray(location?.serviceCategories)) {
      continue;
    }

    for (const category of location.serviceCategories) {
      if (!Array.isArray(category?.services)) {
        continue;
      }

      for (const service of category.services) {
        if (!Array.isArray(service?.availability)) {
          continue;
        }

        for (const slot of service.availability) {
          if (!Array.isArray(slot?.employees)) {
            continue;
          }

          for (const id of slot.employees) {
            if (typeof id === "number") {
              employeeIds.add(id);
            }
          }
        }
      }
    }
  }

  if (employeeIds.size === 0) {
    return availabilityPayload;
  }

  const employees = await EmployeeModel.find(
    { ID: { $in: Array.from(employeeIds) } },
    { ID: 1, FullName: 1, DisplayName: 1, _id: 0 },
  )
    .lean()
    .exec();

  const employeeNameById = new Map<number, string>();
  for (const employee of employees as Array<{
    ID: number;
    FullName?: string;
    DisplayName?: string;
  }>) {
    const name = employee.FullName || employee.DisplayName;
    if (typeof employee.ID === "number" && name) {
      employeeNameById.set(employee.ID, name);
    }
  }

  return (availabilityPayload as any[]).map((location) => ({
    ...location,
    serviceCategories: Array.isArray(location?.serviceCategories)
      ? location.serviceCategories.map((category: any) => ({
          ...category,
          services: Array.isArray(category?.services)
            ? category.services.map((service: any) => ({
                ...service,
                availability: Array.isArray(service?.availability)
                  ? service.availability.map((slot: any) => ({
                      ...slot,
                      employees: Array.isArray(slot?.employees)
                        ? slot.employees.map((id: unknown) =>
                            typeof id === "number"
                              ? `${employeeNameById.get(id) ?? id} [${id}]`
                              : id,
                          )
                        : slot?.employees,
                    }))
                  : service?.availability,
              }))
            : category?.services,
        }))
      : location?.serviceCategories,
  })) as T;
};
