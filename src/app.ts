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
import { authMiddleware } from "./auth/auth";
import { loggerMiddleware } from "./middlewares/loggerMiddleware";

import job from "./config/cron";
import axios from "axios";

import { route } from "./routes/bookingRoutes";

axios.defaults.baseURL = process.env.BASE_URL || "http://localhost:5000";

job.start();

app.use(express.json());

// Routes
app.use(authMiddleware);
app.use(loggerMiddleware);

app.use("/blomilton", route);

app.use("/blomilton/populateLocal", require("./util/populateLocal").default);

export default app;
