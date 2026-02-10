import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  renderCCWidget,
  getWidgetToken,
} from "../controllers/widgetController";

const widgetRouter = Router();

// Rate limiter: 10 requests per 15 minutes per IP
// Prevents brute-force customer ID enumeration and token exhaustion
const widgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Widget page — requires a signed JWT token in the ?token query param
// Mounted at /widget/cc-widget (via app.ts: /widget)
widgetRouter.get("/cc-widget", widgetLimiter, renderCCWidget);

// Token endpoint — requires a signed JWT link token (validated in controller)
// Mounted at /widget/token
widgetRouter.get("/token", widgetLimiter, getWidgetToken);

export default widgetRouter;
