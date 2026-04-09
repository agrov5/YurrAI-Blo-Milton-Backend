import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const dotenv = require("dotenv");

const env = process.env.NODE_ENV || "development";

dotenv.config({
  path: path.resolve(
    __dirname,
    "../environments",
    env === "production"
      ? "../environments/.env.production"
      : "../environments/.env.development",
  ),
});

console.log(`Running in ${env} mode`);

// These require() calls execute after dotenv.config() — unlike import declarations,
// they are NOT hoisted by the TypeScript compiler.
const { authMiddleware } = require("./auth/auth");
const { loggerMiddleware } = require("./middlewares/loggerMiddleware");
const job = require("./config/cron").default;
const axios = require("axios");
const getRouter = require("./routes/getRoutes").default;
const postRouter = require("./routes/postRoutes").default;
const dashboardRoutes = require("./routes/dashboardRoutes").default;
const widgetRouter = require("./routes/widgetRoutes").default;

axios.defaults.baseURL = process.env.AXIOS_BASE_URL || "http://localhost:5000";

job.start();

// Body parsing middleware with increased limits
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use(loggerMiddleware);

// Public routes (no authentication required)
// Dashboard routes
app.use("/admin", dashboardRoutes);

// Widget routes (accessed by customers via SMS link)
app.use("/widget", widgetRouter);

// API routes with authentication
app.use("/api", authMiddleware);

app.use("/api/get", getRouter);
app.use("/api/post", postRouter);

// Utility routes (also protected by auth middleware)
app.use("/api/populateLocal", require("./util/populateLocal").default);

export default app;
