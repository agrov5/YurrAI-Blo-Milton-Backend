import { Router } from "express";
import {
  getTreatments,
  getEmployees,
  getRooms,
  getAvaliableDates,
  getAvaliableTimes,
  getTreatmentById,
  getTreatmentByName,
  getEmployeeById,
  getEmployeeByName,
  getEmployeesSimplified,
  getTreatmentsSimplified,
} from "../controllers/getController";
import {
  twilioController,
  twilioControllerFromParams,
} from "../controllers/twillioController";
import { get } from "http";

const getRouter = Router();

getRouter.get("/treatments", getTreatments);
getRouter.get("/treatments/id", getTreatmentById);
getRouter.get("/treatments/name", getTreatmentByName);
getRouter.get("/treatments/agent", getTreatmentsSimplified);

getRouter.get("/employees", getEmployees);
getRouter.get("/employees/id", getEmployeeById);
getRouter.get("/employees/name", getEmployeeByName);
getRouter.get("/employees/agent", getEmployeesSimplified);

getRouter.get("/rooms", getRooms);

getRouter.get("/available-dates", getAvaliableDates);
getRouter.get("/avaliable-times", getAvaliableTimes);



/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
getRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Blo Milton Backend API",
  });
});

/**
 * @route   GET /auth-test
 * @desc    Test authentication endpoint
 * @access  Private (requires auth)
 */
getRouter.get("/auth-test", (req, res) => {
  res.status(200).json({
    status: "Authenticated",
    timestamp: new Date().toISOString(),
    message: "Authentication successful",
  });
});

export default getRouter;
