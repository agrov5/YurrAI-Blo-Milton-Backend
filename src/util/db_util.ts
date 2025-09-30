/* eslint-disable prettier/prettier */
import { EmployeeModel, Employee, IEmployee } from "../models/Employee";
import { TreatmentModel } from "../models/Treatment";

export const customerLookup = (cusId: number) => {};

export const employeeLookup = async (empId: number) => {
  const employee = await EmployeeModel.findOne({ id: empId }).exec();
  return employee;
};

export const employeeLookupByName = async (name: string) => {
  const employee = await EmployeeModel.findOne({ DisplayName: name }).exec();
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
