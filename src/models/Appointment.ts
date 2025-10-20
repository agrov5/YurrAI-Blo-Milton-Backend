// import { Schema, model } from "mongoose";
import { ArgumentErrors } from "./Treatment";

export interface AgentAppointment {
  email: string;
  phone: number;
  firstName: string;
  lastName: string;
  treatmentName: string;
  employeeName?: string;
  roomName?: string;
  appointmentDate: string;
  startTime: string;
  notes?: string;
}

export interface Appointment {
  access_token: string;
  LocationID: number;
  ResourceTypeID: number;
  Customer: Customer;
  AppointmentTreatmentDTOs: AppointmentTreatmentDTO[];
  AppointmentDateOffset: string; // ISO datetime string
}

export interface Customer {
  Email: string;
  Phone: number;
  FirstName: string;
  LastName: string;
}

export interface AppointmentTreatmentDTO {
  TreatmentID: number; // Any Treatment ID will suffice.
  EmployeeID: number; // 642037 - Aryan Grover
  RoomID: number; // 194349 - All Services Room
  StartTimeOffset: string; // ISO datetime string
  EndTimeOffset: string; // ISO datetime string
}

export interface AppointmentResponse {
  Appointment: any;
  IsSuccess: boolean;
  ErrorCode: number;
  ErrorMessage: string;
  ArgumentErrors: ArgumentErrors[];
}

// export const BookingModel = model("Booking", bookingSchema);
