import { Schema, model } from "mongoose";
import { id } from "./Types";

export interface AppointmentDetails {
  fullName: string;
  email: string;
  phone: string;
  service: string;
  appointmentDate: Date;
  appointmentTime: string;
}

export interface Booking {
  _id?: id;
  appointmentDetails: AppointmentDetails;
  bookingCreatedAt: Date;
  bookingStatus: "pending" | "confirmed" | "cancelled";
}

const bookingSchema = new Schema<Booking>({
  appointmentDetails: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
  },
  bookingCreatedAt: { type: Date, default: Date.now },
  bookingStatus: {
    type: String,
    enum: ["confirmed", "cancelled", "pending"],
    default: "confirmed",
  },
});

export const BookingModel = model("Booking", bookingSchema);
