import express from "express";
import bookingRoutes from "./routes/gawcBookingRoutes";
import { authMiddleware } from "./auth/auth";
import job from './config/cron'

const app = express();

job.start()

app.use(express.json());

// Routes

/// API Endpoint

app.use("/gawc", authMiddleware);
app.use("/gawc/bookings/", bookingRoutes);

export default app;
