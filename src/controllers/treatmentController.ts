import { Request, Response } from "express";
import { TreatmentModel } from "../models/Treatment";

export async function getTreatmentsForDashboard(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const treatments = await TreatmentModel.find(
      {},
      { ID: 1, TreatmentName: 1, Category: 1, TotalDuration: 1, Price: 1 },
    ).lean();
    res.json({ ok: true, treatments });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export async function deleteTreatmentFromDB(
  req: Request,
  res: Response,
): Promise<void> {

  try {
    const { id } = req.params;
    const treatmentId = parseInt(id as string, 10);
    if (isNaN(treatmentId)) {
      res.status(400).json({ ok: false, error: "Invalid treatment ID" });
      return;
    }
    const result = await TreatmentModel.deleteOne({ ID: treatmentId });
    if (result.deletedCount === 0) {
      res.status(404).json({ ok: false, error: "Treatment not found" });
      return;
    }
    res.json({ ok: true, message: `Treatment ${treatmentId} removed from DB` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
