import { Request, Response } from "express";
import {
  checkCustomerExists,
  createAppointment,
  locationID,
  cancelAppointment,
  getCustomerAppointments,
  addNotesToAppointment,
} from "../util/booker_util";
import {
  AgentAppointment,
  CancelAppointment,
  CreateAppointmentResponse,
} from "../models/Appointment";

export const postCreateAppointment = async (req: Request, res: Response) => {
  try {
    const appointment: AgentAppointment = req.body;

    // Validate required fields
    if (
      !appointment.firstName ||
      !appointment.phone ||
      !appointment.treatmentName ||
      !appointment.appointmentDate ||
      !appointment.startTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Please provide firstName, phone, treatmentName, appointmentDate, and startTime",
      });
    }

    const appointmentResponse: CreateAppointmentResponse =
      await createAppointment(appointment);

    if (appointmentResponse.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Appointment created successfully",
        locationID: locationID,
        appointment: appointmentResponse.Appointment,
        appointmentId: appointmentResponse.Appointment?.ID,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          "Failed to create appointment. Please check the details and try again",
        locationID: locationID,
        errors: appointmentResponse.ErrorMessage || "Unknown error",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const postCancelAppointment = async (req: Request, res: Response) => {
  try {
    const appointment: CancelAppointment = req.body;

    // Validate required fields
    if (!appointment.appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Please provide appointmentId",
      });
    }

    const cancelAppointmentResponse: CreateAppointmentResponse =
      await cancelAppointment(appointment);

    if (cancelAppointmentResponse.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully",
        locationID: locationID,
        appointment: cancelAppointmentResponse.Appointment,
        appointmentId: cancelAppointmentResponse.Appointment?.ID,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          "Failed to create appointment. Please check the details and try again",
        locationID: locationID,
        errors: cancelAppointmentResponse.ErrorMessage || "Unknown error",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
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

export const postAddNotesToAppointment = async (req: Request, res: Response) => {
  try {
    const body: { appointmentId: number; notes: string } = req.body;
    if (!body.appointmentId || !body.notes) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Please provide appointmentId and notes",
      });
    }

    const result = await addNotesToAppointment({appointmentId: body.appointmentId, notes: body.notes});
    if (result.IsSuccess) {
      res.status(200).json({
        success: true,
        message: "Notes added to appointment successfully",
        locationID: locationID,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to add notes to appointment",
        locationID: locationID,
        errors: result.ErrorMessage || "Unknown error",
      });
    }  
  } catch (error) {
    res.status(500).json({
      success: false, 
      message: "Failed to add notes to appointment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};