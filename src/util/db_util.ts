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

// Booker treatment names carry stray leading/trailing spaces, and callers (the
// voice agent) don't reliably reproduce them, so match ignoring surrounding
// whitespace and case. An exact match still wins.
export const treatmentLookupByName = async (name: string) => {
  const exact = await TreatmentModel.findOne({ TreatmentName: name }).exec();
  if (exact) return exact;

  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return TreatmentModel.findOne({
    TreatmentName: new RegExp(`^\\s*${escaped}\\s*$`, "i"),
  }).exec();
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

// The salon's timezone. All Booker wall-clock times are in this zone, and its
// UTC offset changes with daylight saving (EDT -04:00 / EST -05:00), so the
// offset is always computed for the specific date rather than hardcoded.
export const businessTimeZone = () =>
  process.env.BUSINESS_TIMEZONE || "America/Toronto";

const pad2 = (n: number) => String(n).padStart(2, "0");

// UTC offset (in minutes, e.g. -240 or -300) of the business timezone at an instant.
const offsetMinutesAt = (instantMs: number): number => {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: businessTimeZone(),
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(instantMs))
    .find((part) => part.type === "timeZoneName")?.value; // "GMT-04:00" or "GMT"
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
};

/**
 * Formats a salon wall-clock time as ISO 8601 with the correct offset for that
 * date, e.g. (2026, 10, 31, 11, 30) -> "2026-10-31T11:30:00-04:00" and
 * (2026, 11, 7, 11, 30) -> "2026-11-07T11:30:00-05:00".
 * Out-of-range minutes/hours roll over (e.g. an end time past midnight).
 */
export const wallClockToISO = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): string => {
  // Normalise through UTC fields so the server's own timezone never matters.
  const wall = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const wallMs = wall.getTime();
  // Two passes resolve the offset correctly on DST-transition days.
  let offset = offsetMinutesAt(wallMs);
  offset = offsetMinutesAt(wallMs - offset * 60 * 1000);

  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return (
    `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(wall.getUTCDate())}` +
    `T${pad2(wall.getUTCHours())}:${pad2(wall.getUTCMinutes())}:00` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
};

/** Today's date (YYYY-MM-DD) at the salon, regardless of the server's timezone. */
export const todayInBusinessTimeZone = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const determineEndTime = async (
  startTime: string,
  treatmentId: number,
  appointmentDate: string,
) => {
  const treatment = await TreatmentModel.findOne({ ID: treatmentId });
  // Fallback to 2 hours (120 minutes)
  const totalMinutes = treatment?.TotalDuration || 120;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [year, month, day] = appointmentDate.split("-").map(Number);
  return wallClockToISO(
    year,
    month,
    day,
    startHour,
    startMinute + totalMinutes,
  );
};

export const convert24toISO = (time24: string, appointmentDate: string) => {
  const [hours, minutes] = time24.split(":").map(Number);
  const [year, month, day] = appointmentDate.split("-").map(Number);
  return wallClockToISO(year, month, day, hours, minutes);
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
    timeZone: businessTimeZone(),
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
    timeZone: businessTimeZone(),
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
