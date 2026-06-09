import { Router } from "express";
import {
  getTreatments,
  getEmployees,
  getRooms,
  getTreatmentById,
  getTreatmentByName,
  getEmployeeById,
  getEmployeeByName,
  getEmployeesSimplified,
  getTreatmentsSimplified,
  getCustomerCCInfo,
  getCustomer,
  getWidgetAuth,
  getAppointments,
  getVapiCalls,
  getRequestLogs,
  getCallStats,
} from "../controllers/getController";
import { phoneController } from "../controllers/phoneController";
import { get } from "http";
import {
  convertISOtoFriendly,
  convertBookerAvailabilityEmployeeIdsToNames,
  convertBookerAvailabilityToFriendlyTime,
} from "../util/db_util";
import { findAvailableTimes } from "../util/booker_util";

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

getRouter.get("/widget/auth", getWidgetAuth);

getRouter.get("/calls/stats", getCallStats);
getRouter.get("/calls", getVapiCalls);
getRouter.get("/logs", getRequestLogs);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
getRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    today_date: convertISOtoFriendly(new Date().toISOString()),
    today_date_system: new Date().toISOString().slice(0, 10),
    service: "Blo Milton Backend API",
    locationID: process.env.LOCATION_ID,
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
    timestamp: convertISOtoFriendly(new Date().toISOString()),
    message: "Authentication successful",
  });
});

// /**
//  * @route   GET /config
//  * @desc    Get frontend configuration including API credentials
//  * @access  Private (requires auth)
//  */
// getRouter.get("/config", (req, res) => {
//   res.status(200).json({
//     trillet: {
//       apiKey: process.env.TRILLET_API_KEY,
//       workspaceId: process.env.TRILLET_WORKSPACE_ID,
//       apiUrl: "https://api.trillet.ai/v1/api/call",
//       callHistoryUrl: "https://api.trillet.ai/v2/api/call-history",
//     },
//     timestamp: new Date().toISOString(),
//   });
// });

export default getRouter;
