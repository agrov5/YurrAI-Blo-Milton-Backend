import { Request, Response } from "express";
import { ITreatment, TreatmentModel } from "../models/Treatment";
import { EmployeeModel, IEmployee } from "../models/Employee";
import { IRoom, RoomModel } from "../models/Room";
import { locationID } from "../util/booker_util";

export const getTreatments = async (req: Request, res: Response) => {
  try {
    const treatments: ITreatment[] = await TreatmentModel.find();
    res.status(200).json({
      message: "success",
      locationID: locationID,
      count: treatments.length,
      results: treatments,
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees: IEmployee[] = await EmployeeModel.find();
    res.status(200).json({
      message: "success",
      locationID: locationID,
      count: employees.length,
      results: employees,
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms: IRoom[] = await RoomModel.find();
    res.status(200).json({
      message: "success",
      locationID: locationID,
      count: rooms.length,
      results: rooms,
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

// export const getEmployeeRankings = async (req: Request, res: Response) => {
//   try {
//     const employeeRankings: IOrder[] = await OrderModel.find().sort({
//       OrderPosition: 1,
//     });
//     res.status(200).json(employeeRankings);
//   } catch (error) {
//     res.status(500).json({ message: "error", errorMessage: error });
//   }
// };
