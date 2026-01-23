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
  getCustomerAppointments,
} from "../util/booker_util";
import { FullAppointmentObject } from "../models/Appointment";

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
    treatmentName?: string;
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
    treatmentName: string;
    employeeId?: number;
  } = req.body;

  try {
    if (!body.date || !body.treatmentName || !body.time) {
      return res.status(400).json({
        success: false,
        message: "Date, time, and treatmentName are required",
      });
    }

    const availableTimes = await findAvailableTimes(body);
    res.status(200).json({
      success: true,
      message: "Available times retrieved successfully",
      locationID: locationID,
      date: body.date,
      treatment: body.treatmentName,
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

export const getAppointments = async (req: Request, res: Response) => {
  const body: {
    customerId: number;
    treatmentName?: string;
    date?: string;
    time?: string;
    onlyActive?: boolean;
    fromStartDate?: string;
    returnSingle?: boolean;
  } = req.body;

  try {
    if (!body.customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    const result = await getCustomerAppointments({
      customerId: body.customerId,
      treatmentName: body.treatmentName,
      date: body.date,
      time: body.time,
      onlyActive: body.onlyActive,
      fromStartDate: body.fromStartDate,
      returnSingle: body.returnSingle,
    });

    // Helper function to clean appointment data
    const cleanAppointment = (appointment: any) => ({
      id: appointment.ID,
      status: appointment.Status?.Name,
      startDateTime: appointment.StartDateTimeOffset,
      endDateTime: appointment.EndDateTimeOffset,
      customer: {
        id: appointment.CustomerID,
        firstName: appointment.CustomerFirstName,
        lastName: appointment.CustomerLastName,
        email: appointment.CustomerEmail,
        phone: appointment.CustomerMobilePhone || appointment.CustomerHomePhone,
      },
      treatment: appointment.TreatmentName,
      employee: appointment.Employee
        ? `${appointment.Employee.FirstName} ${appointment.Employee.LastName}`
        : null,
      finalTotal: appointment.FinalTotal?.Amount,
    });

    // Handle single appointment return
    if (body.returnSingle) {
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "No appointment found matching the criteria",
        });
      }

      const cleanedAppointment = cleanAppointment(result);

      return res.status(200).json({
        success: true,
        message: "Appointment retrieved successfully",
        locationID: locationID,
        appointment: cleanedAppointment,
      });
    }

    // Handle multiple appointments return
    const appointments = result as any[];

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No appointments found for this customer",
      });
    }

    const cleanedAppointments = appointments.map(cleanAppointment);

    res.status(200).json({
      success: true,
      message: "Appointments retrieved successfully",
      locationID: locationID,
      count: cleanedAppointments.length,
      appointments: cleanedAppointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve appointments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
