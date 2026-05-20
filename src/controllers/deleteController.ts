import { Request, Response } from "express";
import { RequestLogModel } from "../models/RequestLog";
import { clearLogs } from "../middlewares/loggerMiddleware";
import { TreatmentModel } from "../models/Treatment";
import { clearDB } from "../config/database";

export const deleteServerLogs = async (req: Request, res: Response) => {
  try {
    await RequestLogModel.deleteMany({});
    clearLogs();
    res.json({ ok: true, message: "Logs cleared" });
  } catch (error) {
    console.error("Failed to clear request logs:", error);
    res.status(500).json({ ok: false, message: "Unable to clear logs" });
  }
}

export const dropDatabase = async (req: Request, res: Response) => {
  try {
    await clearDB();
    res.json({ ok: true, message: "Database cleared" });
  } catch (error) {
    console.error("Failed to clear database:", error);
    res.status(500).json({ ok: false, message: "Unable to clear database" });
  }
}

