import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  cancelBooking,
} from "../controllers/bookingController";

const router = Router();

router.post("/", createBooking);
router.get("/", getAllBookings);
router.delete("/", cancelBooking);

export default router;
