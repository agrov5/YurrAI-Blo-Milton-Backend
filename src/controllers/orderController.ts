import { Request, Response } from "express";
import { OrderModel, IOrder } from "../models/Order";
import { EmployeeModel } from "../models/Employee";

/**
 * Get all employee orders sorted by position
 */
export const getEmployeeOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const orders = await OrderModel.find().sort({ OrderPosition: 1 }).exec();

    // If no orders exist, create default order based on employees
    if (orders.length === 0) {
      const employees = await EmployeeModel.find().exec();
      const defaultOrders = employees.map((employee, index) => ({
        EmployeeDisplayName: employee.DisplayName,
        EmployeeID: employee.ID,
        OrderPosition: index + 1,
      }));

      await OrderModel.insertMany(defaultOrders);
      const newOrders = await OrderModel.find()
        .sort({ OrderPosition: 1 })
        .exec();

      res.json({
        success: true,
        data: newOrders,
        message: "Default employee order created",
      });
      return;
    }

    res.json({
      success: true,
      data: orders,
      message: "Employee order retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting employee order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve employee order",
      details: error.message,
    });
  }
};

/**
 * Update employee order positions
 */
export const updateEmployeeOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { orderedEmployees } = req.body;

    if (!Array.isArray(orderedEmployees)) {
      res.status(400).json({
        success: false,
        error: "orderedEmployees must be an array",
      });
      return;
    }

    // Validate that all required fields are present
    for (const employee of orderedEmployees) {
      if (
        !employee.EmployeeID ||
        !employee.EmployeeDisplayName ||
        employee.OrderPosition === undefined
      ) {
        res.status(400).json({
          success: false,
          error:
            "Each employee must have EmployeeID, EmployeeDisplayName, and OrderPosition",
        });
        return;
      }
    }

    // Clear existing orders
    await OrderModel.deleteMany({});

    // Insert new order
    await OrderModel.insertMany(orderedEmployees);

    // Fetch and return the updated order
    const updatedOrders = await OrderModel.find()
      .sort({ OrderPosition: 1 })
      .exec();

    res.json({
      success: true,
      data: updatedOrders,
      message: "Employee order updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating employee order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update employee order",
      details: error.message,
    });
  }
};

/**
 * Reset employee order to alphabetical
 */
export const resetEmployeeOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employees = await EmployeeModel.find()
      .sort({ DisplayName: 1 })
      .exec();

    const alphabeticalOrders = employees.map((employee, index) => ({
      EmployeeDisplayName: employee.DisplayName,
      EmployeeID: employee.ID,
      OrderPosition: index + 1,
    }));

    // Clear existing orders and insert new alphabetical order
    await OrderModel.deleteMany({});
    await OrderModel.insertMany(alphabeticalOrders);

    const updatedOrders = await OrderModel.find()
      .sort({ OrderPosition: 1 })
      .exec();

    res.json({
      success: true,
      data: updatedOrders,
      message: "Employee order reset to alphabetical",
    });
  } catch (error: any) {
    console.error("Error resetting employee order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset employee order",
      details: error.message,
    });
  }
};

/**
 * Get all employees for ordering (for reference)
 */
export const getEmployeesForOrdering = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const employees = await EmployeeModel.find().exec();

    res.json({
      success: true,
      data: employees,
      message: "Employees retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting employees:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve employees",
      details: error.message,
    });
  }
};
