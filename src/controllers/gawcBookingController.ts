import mongoose from "mongoose";
import { Request, Response } from "express";
import { Booking, BookingModel } from "../models/GAWC-Booking";
import { id } from "../models/Types";

export const getAllBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const bookings = await BookingModel.find();
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createBooking = async (
  // Create a new calendar event
  req: Request,
  res: Response
): Promise<void> => {
  const bookingData: Booking = {
    appointmentDetails: req.body.appointmentDetails,
    bookingCreatedAt: new Date(),
    bookingStatus: "pending",
  };

  const booking = new BookingModel(bookingData);

  booking
    .save()
    .then((savedBooking) => {
      res.status(201).json(savedBooking);
    })
    .catch((error) => {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    });
};

export const cancelBooking = async (
  // Delete a calendar event
  req: Request,
  res: Response
): Promise<any> => {
  const bookingId: id = req.body.id;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ message: "Invalid booking ID" });
  }

  try {
    const booking = await BookingModel.findByIdAndUpdate(
      bookingId,
      { bookingStatus: "cancelled" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
