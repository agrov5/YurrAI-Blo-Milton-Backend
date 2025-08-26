import express, { Request, Response, NextFunction } from "express";
import { findEmployees, findTreatments, findRooms } from "./booker_post_util";
import { FindTreatmentsResponse, TreatmentModel } from "../models/Treatment";

// Example function to run and populate local DB
async function runPopulateFunctions() {
  try {
    const employees = await findEmployees();
    const treatments: FindTreatmentsResponse = await findTreatments();
    const rooms = await findRooms();

    if (treatments) {
      treatments.Treatments?.forEach((treatment) => {
        if (treatment.IsActive && !treatment.IsDeleted) {
          TreatmentModel.findOneAndUpdate(
            { ID: treatment.ID }, // filter by unique field
            {
              ID: treatment.ID,
              TreatmentName: treatment.Name,
              Price: treatment.Price,
              Category: treatment.Category,
              SubCategory: treatment.SubCategory,
              EmployeeIDs: treatment.EmployeeIDs,
              RoomIDs: treatment.RoomIDs,
            },
            { upsert: true, new: true }
          );
        }
      });
    } else {
      console.log("No treatments found to populate.");
    }
  } catch (error) {
    console.log("Error populating local DB:", error);
  }

  return { success: true, message: "Local DB updated." };
}

// Controller
async function populateLocalController(req: Request, res: Response) {
  try {
    const result = await runPopulateFunctions();
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
}

// Express router setup
const router = express.Router();
router.get("/", populateLocalController);

export default router;
