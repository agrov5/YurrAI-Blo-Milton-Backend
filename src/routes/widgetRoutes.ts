import { Router } from "express";
import { renderCCWidget } from "../controllers/widgetController";

const widgetRouter = Router();

// This route does NOT require authentication since it's accessed by customers via SMS
widgetRouter.get("/cc-widget", renderCCWidget);

export default widgetRouter;
