import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.disable("etag");

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
import getRouter from "./routes/getRoutes";
import postRouter from "./routes/postRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

axios.defaults.baseURL = process.env.AXIOS_BASE_URL || "http://localhost:5000";

job.start();

// Body parsing middleware with increased limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use(loggerMiddleware);

// Dashboard routes (public)
app.use("/", dashboardRoutes);

// API routes with authentication
app.use("/api", authMiddleware);

app.use("/api/get", getRouter);
app.use("/api/post", postRouter);

// Utility routes (also protected by auth middleware)
app.use("/api/populateLocal", require("./util/populateLocal").default);

export default app;
