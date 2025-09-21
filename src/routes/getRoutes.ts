import { Router } from "express";
import {
  getTreatments,
  getEmployees,
  getRooms,
} from "../controllers/getController";
import {
  twilioController,
  twilioControllerFromParams,
} from "../controllers/twillioController";
import {
  getEmployeeOrder,
  updateEmployeeOrder,
  resetEmployeeOrder,
  getEmployeesForOrdering,
} from "../controllers/orderController";

const router = Router();

/**
 * @route   GET /treatments
 * @desc    Get all treatments
 * @access  Private (requires auth)
 */

router.get("/treatments", getTreatments);

/**
 * @route   GET /employees
 * @desc    Get all employees
 * @access  Private (requires auth)
 */
router.get("/employees", getEmployees);

/**
 * @route   GET /rooms
 * @desc    Get all rooms
 * @access  Private (requires auth)
 */
router.get("/rooms", getRooms);

/**
 * @route   GET /order
 * @desc    Get employee order
 * @access  Private (requires auth)
 */
router.get("/order", getEmployeeOrder);

/**
 * @route   PUT /order
 * @desc    Update employee order
 * @access  Private (requires auth)
 */
router.put("/order", updateEmployeeOrder);

/**
 * @route   POST /order/reset
 * @desc    Reset employee order to alphabetical
 * @access  Private (requires auth)
 */
router.post("/order/reset", resetEmployeeOrder);

/**
 * @route   GET /all-employees
 * @desc    Get all employees for ordering (for reference)
 * @access  Private (requires auth)
 */
router.get("/all-employees", getEmployeesForOrdering);

/**
 * @route   POST /sms
 * @desc    Send SMS message via Twilio (body parameters)
 * @access  Private (requires auth)
 */

/**
 * @route   POST /sms
 * @desc    Send SMS message via Twilio (body parameters)
 * @access  Private (requires auth)
 */
router.get("/sms", twilioController);

/**
 * @route   GET /sms/:to/:body
 * @desc    Send SMS message via Twilio (URL parameters)
 * @access  Private (requires auth)
 * @example GET /sms/+1234567890/Hello%20World
 */
router.get("/sms/:to/:body", twilioControllerFromParams);

/**
 * @route   GET /treatments/:id
 * @desc    Get treatment by ID
 * @access  Private (requires auth)
 */
// router.get("/treatments/:id", getTreatmentById);

/**
 * @route   GET /appointments
 * @desc    Get all appointments
 * @access  Private (requires auth)
 */
// router.get("/appointments", getAppointments);

/**
 * @route   GET /appointments/:id
 * @desc    Get appointment by ID
 * @access  Private (requires auth)
 */
// router.get("/appointments/:id", getAppointmentById);

/**
 * @route   GET /employees
 * @desc    Get all employees
 * @access  Private (requires auth)
 */
// router.get("/employees", getEmployees);

/**
 * @route   GET /employees/:id
 * @desc    Get employee by ID
 * @access  Private (requires auth)
 */
// router.get("/employees/:id", getEmployeeById);

/**
 * @route   GET /rooms/:id
 * @desc    Get room by ID
 * @access  Private (requires auth)
 */
// router.get("/rooms/:id", getRoomById);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/health", (req, res) => {
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
router.get("/auth-test", (req, res) => {
  res.status(200).json({
    status: "Authenticated",
    timestamp: new Date().toISOString(),
    message: "Authentication successful",
  });
});

export default router;
