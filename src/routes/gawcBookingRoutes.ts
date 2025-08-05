import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  cancelBooking,
} from "../controllers/gawcBookingController";

const router = Router();

router.post("/", createBooking);
router.get("/", getAllBookings);
router.delete("/", cancelBooking);

export default router;
