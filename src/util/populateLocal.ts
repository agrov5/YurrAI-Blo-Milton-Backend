import express, { Request, Response, NextFunction } from "express";
import { findEmployees, findTreatments, findRooms } from "./booker_post_util";
import { FindTreatmentsResponse, TreatmentModel } from "../models/Treatment";
import { FindRoomsResponse, RoomModel } from "../models/Room";
import { FindEmployeesResponse, EmployeeModel } from "../models/Employee";
import { clearDB } from "../config/database";

// Example function to run and populate local DB
async function runPopulateFunctions() {
  // Global toggle for all models
  const useFindAndUpdate = false;

  if (!useFindAndUpdate) {
    await clearDB();
  }

  try {
    const employees: FindEmployeesResponse = await findEmployees();
    const treatments: FindTreatmentsResponse = await findTreatments();
    const rooms: FindRoomsResponse = await findRooms();

    if (employees) {
      employees.Results?.forEach((employee) => {
        if (useFindAndUpdate) {
          EmployeeModel.findOneAndUpdate(
            { ID: employee.ID },
            {
              ID: employee.ID,
              DisplayName: employee.DisplayName,
              FirstName: employee.FirstName,
              LastName: employee.LastName,
              Gender: employee.Gender.Name,
            },
            { upsert: true, new: true }
          );
        } else {
          EmployeeModel.create({
            ID: employee.ID,
            DisplayName: employee.DisplayName,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            Gender: employee.Gender.Name,
          });
        }
      });
    } else {
      console.log("No employees found to populate.");
    }

    if (rooms) {
      rooms.Results?.forEach((room) => {
        if (useFindAndUpdate) {
          RoomModel.findOneAndUpdate(
            { ID: room.ID },
            {
              ID: room.ID,
              Name: room.Name,
              TreatmentIDs: room.Treatments,
            },
            { upsert: true, new: true }
          );
        } else {
          RoomModel.create({
            ID: room.ID,
            Name: room.Name,
            TreatmentIDs: room.Treatments,
          });
        }
      });
    } else {
      console.log("No active rooms found to populate.");
    }

    if (treatments) {
      treatments.Treatments?.forEach((treatment) => {
        if (treatment.IsActive && !treatment.IsDeleted) {
          if (useFindAndUpdate) {
            TreatmentModel.findOneAndUpdate(
              { ID: treatment.ID },
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
          } else {
            TreatmentModel.create({
              ID: treatment.ID,
              TreatmentName: treatment.Name,
              Price: treatment.Price,
              Category: treatment.Category,
              SubCategory: treatment.SubCategory,
              EmployeeIDs: treatment.EmployeeIDs,
              RoomIDs: treatment.RoomIDs,
            });
          }
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
