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
  const treatment = await TreatmentModel.findOne({ TreatmentName: name }).exec();
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
  
  export const convert24toISO = (time24: string, appointmentDate: string) => {
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