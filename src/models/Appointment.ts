// import { Schema, model } from "mongoose";

export interface AgentAppointment {
  email: string;
  firstName: string;
  lastName: string;
  startTimeOffset: string;
  endTimeOffset: string;
  appointmentDateOffset: string;
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

// export const BookingModel = model("Booking", bookingSchema);


