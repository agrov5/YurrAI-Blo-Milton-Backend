import { Request, Response } from "express";
import {
  checkCustomerExists,
  createAppointment,
  locationID,
} from "../util/booker_util";
import {
  AgentAppointment,
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
