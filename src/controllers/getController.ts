import { Request, Response } from "express";
import { ITreatment, TreatmentModel } from "../models/Treatment";
import { EmployeeModel, IEmployee } from "../models/Employee";
import { IRoom, RoomModel } from "../models/Room";

export const getTreatments = async (req: Request, res: Response) => {
  try {
    const treatments: ITreatment[] = await TreatmentModel.find();
    res.status(200).json({ message: "success", results: treatments });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees: IEmployee[] = await EmployeeModel.find();
    res.status(200).json({ message: "success", results: employees });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms: IRoom[] = await RoomModel.find();
    res.status(200).json({ message: "success", results: rooms });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};
