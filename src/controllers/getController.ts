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
      success: true,
      message: "Treatments retrieved successfully",
      locationID: locationID,
      count: treatments.length,
      treatments: treatments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve treatments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getTreatmentByName = async (req: Request, res: Response) => {
  const body: { name: string } = req.body;

  try {
    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "Treatment name is required",
      });
    }
    const treatment = await TreatmentModel.findOne({
      TreatmentName: body.name,
    }).exec();
    if (treatment) {
      res.status(200).json({
        success: true,
        message: "Treatment found",
        locationID: locationID,
        treatment: treatment,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Treatment '${body.name}' not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve treatment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getTreatmentById = async (req: Request, res: Response) => {
  const body: { id: number } = req.body;
  try {
    if (!body.id) {
      return res.status(400).json({
        success: false,
        message: "Treatment ID is required",
      });
    }
    const treatment = await TreatmentModel.findOne({ ID: body.id }).exec();
    if (treatment) {
      res.status(200).json({
        success: true,
        message: "Treatment found",
        locationID: locationID,
        treatment: treatment,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Treatment with ID ${body.id} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve treatment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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
      success: true,
      message: "Treatments retrieved successfully",
      locationID: locationID,
      count: treatments.length,
      treatments: treatments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve treatments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees: IEmployee[] = await EmployeeModel.find();
    res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      locationID: locationID,
      count: employees.length,
      employees: employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employees",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEmployeeByName = async (req: Request, res: Response) => {
  const body: { name: string } = req.body;
  try {
    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }
    const employee = await EmployeeModel.findOne({
      FullName: body.name,
    }).exec();
    if (employee) {
      res.status(200).json({
        success: true,
        message: "Employee found",
        locationID: locationID,
        employee: employee,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Employee '${body.name}' not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employee",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const body: { id: number } = req.body;
  try {
    if (!body.id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }
    const employee = await EmployeeModel.findOne({ ID: body.id }).exec();
    if (employee) {
      res.status(200).json({
        success: true,
        message: "Employee found",
        locationID: locationID,
        employee: employee,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Employee with ID ${body.id} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employee",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEmployeesSimplified = async (req: Request, res: Response) => {
  try {
    const employees: IEmployee[] = await EmployeeModel.find(
      {},
      { ID: 1, FullName: 1, _id: 0 }
    );
    res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      locationID: locationID,
      count: employees.length,
      employees: employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve employees",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms: IRoom[] = await RoomModel.find();
    res.status(200).json({
      success: true,
      message: "Rooms retrieved successfully",
      locationID: locationID,
      count: rooms.length,
      rooms: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve rooms",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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
      return res.status(400).json({
        success: false,
        message: "Both fromDate and toDate are required",
      });
    }
    const availableDates = await findAvailableDates(body);
    res.status(200).json({
      success: true,
      message: "Available dates retrieved successfully",
      locationID: locationID,
      fromDate: body.fromDate,
      toDate: body.toDate,
      dates: availableDates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available dates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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
      return res.status(400).json({
        success: false,
        message: "Date, time, and serviceId are required",
      });
    }

    const availableTimes = await findAvailableTimes(body);
    res.status(200).json({
      success: true,
      message: "Available times retrieved successfully",
      locationID: locationID,
      date: body.date,
      serviceId: body.serviceId,
      times: availableTimes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available times",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCustomerCCInfo = async (req: Request, res: Response) => {
  const body: { customerId: number } = req.body;

  if (!body.customerId) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required",
    });
  }

  try {
    const ccInfo = await getCustomerCreditCardInfo(body.customerId);
    if (ccInfo) {
      res.status(200).json({
        success: true,
        message: "Credit card information retrieved successfully",
        locationID: locationID,
        customerId: body.customerId,
        creditCard: ccInfo,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "No credit card information found for this customer",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve credit card information",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCustomer = async (req: Request, res: Response) => {
  const body: { firstName: string; phone: string } = req.body;
  try {
    if (!body.firstName || !body.phone) {
      return res.status(400).json({
        success: false,
        message: "First name and phone number are required",
      });
    }

    const customer = await checkCustomerExists(body.firstName, body.phone);
    if (customer) {
      res.status(200).json({
        success: true,
        message: "Customer found",
        locationID: locationID,
        customer: customer,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Customer '${body.firstName}' with phone ${body.phone} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve customer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getWidgetAuth = async (req: Request, res: Response) => {
  try {
    const token = await getWidgetAuthToken();
    res.status(200).json({
      success: true,
      message: "Widget authentication token retrieved successfully",
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve widget authentication token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
