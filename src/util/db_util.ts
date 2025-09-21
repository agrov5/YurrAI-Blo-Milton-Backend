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
