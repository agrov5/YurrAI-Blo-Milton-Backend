import express from "express";
import path from "path";

const app = express();

const dotenv = require("dotenv");

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: path.resolve(
    __dirname,
    "../environments",
    env === "production"
      ? "../environments/.env.production"
      : "../environments/.env.development"
  ),
});

console.log(`Running in ${env} mode`);

// Import modules that depend on environment variables AFTER dotenv.config()
import bookingRoutes from "./routes/bookingRoutes";
import { authMiddleware } from "./auth/auth";
import job from "./config/cron";
import { loggerMiddleware } from "./middlewares/loggerMiddleware";

job.start();

app.use(express.json());

// Routes

app.use("/gawc", authMiddleware);
app.use(loggerMiddleware);
app.use("/gawc/bookings/", bookingRoutes);

export default app;
