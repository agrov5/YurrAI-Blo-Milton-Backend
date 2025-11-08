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

    const appointmentResponse: CreateAppointmentResponse =
      await createAppointment(appointment);

    if (appointmentResponse.IsSuccess) {
      res.status(200).json({
        message: "Appointment created successfully",
        locationID: locationID,
        appointment: appointmentResponse,
      });
    } else {
      res.status(400).json({
        message: "Failed to create appointment",
        locationID: locationID,
        appointment: appointmentResponse,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};
