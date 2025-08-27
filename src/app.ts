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
import router from "./routes/getRoutes";

axios.defaults.baseURL = process.env.AXIOS_BASE_URL || "http://localhost:5000";

job.start();

app.use(express.json());

// Routes
app.use(loggerMiddleware);

// API routes with authentication
app.use("/blomilton", authMiddleware);

// Root router for /blomilton
app.use("/blomilton", router);

// Utility routes
app.use("/blomilton/populateLocal", require("./util/populateLocal").default);

export default app;
