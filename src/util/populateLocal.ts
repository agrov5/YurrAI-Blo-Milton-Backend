import express, { Request, Response, NextFunction } from "express";
import {
  findEmployees,
  findTreatments,
  findRooms,
  locationID,
} from "./booker_util";
import { FindTreatmentsResponse, TreatmentModel } from "../models/Treatment";
import { FindRoomsResponse, RoomModel } from "../models/Room";
import { FindEmployeesResponse, EmployeeModel } from "../models/Employee";
import { clearDB } from "../config/database";
import { sortEmployeeIdsInTreatementsByRank } from "./db_util";

// Example function to run and populate local DB
async function runPopulateFunctions() {
  // Global toggle for all models
  const useFindAndUpdate = true;

  if (!useFindAndUpdate) {
    await clearDB();
  }

  try {
    const employees: FindEmployeesResponse = await findEmployees();
    const treatments: FindTreatmentsResponse = await findTreatments();
    const rooms: FindRoomsResponse = await findRooms();

    // Track valid IDs for filtering
    const validEmployeeIds = new Set<number>();
    const validRoomIds = new Set<number>();

    if (employees) {
      for (const employee of employees.Results || []) {
        // Only process Scheduled employees
        if (employee.Type !== 1) continue;

        validEmployeeIds.add(employee.ID);

        if (useFindAndUpdate) {
          await EmployeeModel.findOneAndUpdate(
            { ID: employee.ID },
            {
              ID: employee.ID,
              FullName: employee.FirstName + " " + employee.LastName,
              Rank: employee.Rank,
              DisplayName: employee.DisplayName,
              FirstName: employee.FirstName,
              LastName: employee.LastName,
              Gender: employee.Gender.Name,
            },
            { upsert: true, new: true },
          );
        } else {
          await EmployeeModel.create({
            ID: employee.ID,
            FullName: employee.FirstName + " " + employee.LastName,
            Rank: employee.Rank,
            DisplayName: employee.DisplayName,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            Gender: employee.Gender.Name,
          });
        }
      }
    } else {
      console.log("No employees found to populate.");
    }

    if (rooms) {
      for (const room of rooms.Results || []) {
        if (room.ID !== undefined) {
          validRoomIds.add(room.ID);
        }

        if (useFindAndUpdate) {
          await RoomModel.findOneAndUpdate(
            { ID: room.ID },
            {
              ID: room.ID,
              Name: room.Name,
              TreatmentIDs: room.Treatments,
            },
            { upsert: true, new: true },
          );
        } else {
          await RoomModel.create({
            ID: room.ID,
            Name: room.Name,
            TreatmentIDs: room.Treatments,
          });
        }
      }
    } else {
      console.log("No active rooms found to populate.");
    }

    if (treatments) {
      for (const treatment of treatments.Treatments || []) {
        if (
          treatment.IsActive &&
          !treatment.IsDeleted &&
          treatment.AllowCustomersToBookOnline
        ) {
          // Filter to only include valid employee and room IDs
          const filteredEmployeeIDs = (treatment.EmployeeIDs || []).filter(
            (id) => validEmployeeIds.has(id),
          );
          const filteredRoomIDs = (treatment.RoomIDs || []).filter((id) =>
            validRoomIds.has(id),
          );

          if (useFindAndUpdate) {
            await TreatmentModel.findOneAndUpdate(
              { ID: treatment.ID },
              {
                ID: treatment.ID,
                TreatmentName: treatment.Name,
                Price: treatment.Price,
                Category: treatment.Category,
                SubCategory: treatment.SubCategory,
                TotalDuration: treatment.TotalDuration,
                EmployeeIDs: filteredEmployeeIDs,
                RoomIDs: filteredRoomIDs,
              },
              { upsert: true, new: true },
            );
          } else {
            await TreatmentModel.create({
              ID: treatment.ID,
              TreatmentName: treatment.Name,
              Price: treatment.Price,
              Category: treatment.Category,
              SubCategory: treatment.SubCategory,
              TotalDuration: treatment.TotalDuration,
              EmployeeIDs: filteredEmployeeIDs,
              RoomIDs: filteredRoomIDs,
            });
          }
        }
      }
    } else {
      console.log("No treatments found to populate.");
    }
  } catch (error) {
    console.log("Error populating local DB:", error);
  }

  await sortEmployeeIdsInTreatementsByRank();

  return {
    success: true,
    message: "Local DB updated.",
    locationID: locationID,
  };
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
