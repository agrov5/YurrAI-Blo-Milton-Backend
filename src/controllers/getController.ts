import { Request, Response } from "express";
import { ITreatment, TreatmentModel } from "../models/Treatment";
import { EmployeeModel, IEmployee } from "../models/Employee";
import { IRoom, RoomModel } from "../models/Room";
import {
  findAvailableDates,
  findAvailableTimes,
  getCustomerCreditCardInfo,
  locationID,
  checkCustomerExists,
  getWidgetAuthToken,
} from "../util/booker_util";

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

export const getTreatmentByName = async (req: Request, res: Response) => {
  const body: { name: string } = req.body;

  try {
    if (!body.name) {
      return res.status(400).json({ message: "name is required." });
    }
    const treatment = await TreatmentModel.findOne({
      TreatmentName: body.name,
    }).exec();
    if (treatment) {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        result: treatment,
      });
    } else {
      res.status(404).json({ message: "Treatment not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getTreatmentById = async (req: Request, res: Response) => {
  const body: { id: number } = req.body;
  try {
    if (!body.id) {
      return res.status(400).json({ message: "id is required." });
    }
    const treatment = await TreatmentModel.findOne({ ID: body.id }).exec();
    if (treatment) {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        result: treatment,
      });
    } else {
      res.status(404).json({ message: "Treatment not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getTreatmentsSimplified = async (req: Request, res: Response) => {
  try {
    const treatments = await TreatmentModel.aggregate([
      {
        $project: {
          _id: 0,
          ID: 1,
          TreatmentName: 1,
          Price: "$Price.Amount",
          TotalDuration: 1,
        },
      },
    ]);

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

export const getEmployeeByName = async (req: Request, res: Response) => {
  const body: { name: string } = req.body;
  try {
    if (!body.name) {
      return res.status(400).json({ message: "name is required." });
    }
    const employee = await EmployeeModel.findOne({
      FullName: body.name,
    }).exec();
    if (employee) {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        result: employee,
      });
    } else {
      res.status(404).json({ message: "Employee not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const body: { id: number } = req.body;
  try {
    if (!body.id) {
      return res.status(400).json({ message: "id is required." });
    }
    const employee = await EmployeeModel.findOne({ ID: body.id }).exec();
    if (employee) {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        result: employee,
      });
    } else {
      res.status(404).json({ message: "Employee not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getEmployeesSimplified = async (req: Request, res: Response) => {
  try {
    const employees: IEmployee[] = await EmployeeModel.find(
      {},
      { ID: 1, FullName: 1, _id: 0 }
    );
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

export const getAvaliableDates = async (req: Request, res: Response) => {
  const body: {
    fromDate: string;
    toDate: string;
    employeeId?: number;
    serviceId?: number;
  } = req.body;

  try {
    if (!body.fromDate || !body.toDate) {
      return res
        .status(400)
        .json({ message: "fromDate and toDate are required." });
    }
    await findAvailableDates(body).then((availableDates) => {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        results: availableDates,
      });
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getAvaliableTimes = async (req: Request, res: Response) => {
  const body: {
    date: string;
    time: string;
    serviceId: number;
    employeeId?: number;
  } = req.body;

  try {
    if (!body.date || !body.serviceId || !body.time) {
      return res
        .status(400)
        .json({ message: "date, time and serviceId are required." });
    }

    await findAvailableTimes(body).then((availableTimes) => {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        results: availableTimes,
      });
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getCustomerCCInfo = async (req: Request, res: Response) => {
  const body: { customerId: number } = req.body;

  if (!body.customerId) {
    return res.status(400).json({ message: "customerId is required." });
  }

  try {
    await getCustomerCreditCardInfo(body.customerId).then((ccInfo) => {
      res.status(200).json({
        message: "success",
        locationID: locationID,
        results: ccInfo,
      });
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  const body: { firstName: string; phone: string } = req.body;
  try {
    if (!body.firstName || !body.phone) {
      return res.status(400).json({
        message:
          "Following fields are required: firstName: string, phone: string",
      });
    }

    await checkCustomerExists(body.firstName, body.phone).then((cus) => {
      if (cus) {
        res.status(200).json({
          message: "customer found",
          locationID: locationID,
          customer: cus,
        });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};

export const getWidgetAuth = async (req: Request, res: Response) => {
  try {
    const token = await getWidgetAuthToken();
    res.status(200).json({
      message: "success",
      token: token,
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};
