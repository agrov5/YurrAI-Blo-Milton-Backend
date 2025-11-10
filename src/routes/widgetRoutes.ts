import { Router } from "express";
import {
  renderCCWidget,
  getWidgetToken,
} from "../controllers/widgetController";

const widgetRouter = Router();

// This route does NOT require authentication since it's accessed by customers via SMS
widgetRouter.get("/cc-widget", renderCCWidget);

// Token endpoint - also public but validates customerId
widgetRouter.get("/widget/token", getWidgetToken);

export default widgetRouter;
