// Redirect /dashboard to dashboard.html
import { Request, Response, Router } from "express";
const dashboardRouter = Router();

dashboardRouter.get("/dashboard", (req: Request, res: Response) => {
  res.sendFile("dashboard.html", { root: __dirname + "/../public" });
});

export default dashboardRouter;
