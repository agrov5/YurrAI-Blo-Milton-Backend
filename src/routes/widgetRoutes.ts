import { Router } from "express";
import {
  renderCCWidget,
  getWidgetToken,
} from "../controllers/widgetController";

const widgetRouter = Router();

// This route does NOT require authentication since it's accessed by customers via SMS
// Mounted at /widget/cc-widget (via app.ts: /widget)
widgetRouter.get("/cc-widget", renderCCWidget);

// Token endpoint - also public but validates customerId
// Mounted at /widget/token
widgetRouter.get("/token", getWidgetToken);

export default widgetRouter;
