import { Request, Response } from "express";
import { ITreatment, TreatmentModel } from "../models/Treatment";

export const getTreatments = async (req: Request, res: Response) => {
  try {
    const treatments: ITreatment[] = await TreatmentModel.find();
    res.status(200).json({ message: "success", results: treatments });
  } catch (error) {
    res.status(500).json({ message: "error", errorMessage: error });
  }
};



