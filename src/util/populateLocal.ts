import express, { Request, Response, NextFunction } from "express";
import { findEmployees, findTreatments, findRooms } from "./booker_post_util";


// Example function to run and populate local DB
async function runPopulateFunctions() {
  try {
    const employees = await findEmployees();
    const treatments = await findTreatments();
    const rooms = await findRooms();
  } catch (error) {
    console.log("Error populating local DB:", error);
  }



  return { success: true, message: "Local DB populated." };
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
