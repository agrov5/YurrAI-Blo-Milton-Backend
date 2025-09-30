import { Request, Response } from "express";
import { createAppointment, locationID } from "../util/booker_util";
import { AgentAppointment } from "../models/Appointment";

export const postCreateAppointment = async (req: Request, res: Response) => {
  try {
    const appointment: AgentAppointment = req.body;

    await createAppointment(appointment).then((appointmentResponse) => {
      res.status(200).json({
        message: "Appointment created successfully",
        appointment: appointmentResponse,
      });
    });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};
