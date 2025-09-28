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
}