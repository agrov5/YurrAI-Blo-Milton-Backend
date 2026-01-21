import { Request, Response } from "express";
import { sendMessage, sendMessageToAdmin } from "../util/phone_util";

export const phoneController = async (req: Request, res: Response) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        message:
          "Both 'to' (phone number) and 'body' (message text) are required",
      });
    }

    await sendMessage(to, body);
    res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      to: to,
      messageLength: body.length,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const sendMessageToAdminController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({
        success: false,
        message: "Message body is required",
      });
    }
    await sendMessageToAdmin(body);
    res.status(200).json({
      success: true,
      message: "Message sent to admin successfully",
      messageLength: body.length,
    });
  } catch (error) {
    console.error("Error sending message to admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message to admin",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const phoneControllerFromParams = async (
  req: Request,
  res: Response,
) => {
  try {
    const { to, body } = req.params;

    if (!to || !body) {
      return res.status(400).json({
        success: false,
        message:
          "Both 'to' (phone number) and 'body' (message text) parameters are required in the URL",
      });
    }

    // Decode the body parameter in case it contains URL-encoded characters
    const decodedBody = decodeURIComponent(body);

    await sendMessage(to, decodedBody);
    res.status(200).json({
      success: true,
      message: "SMS sent successfully",
      to: to,
      messageBody: decodedBody,
      messageLength: decodedBody.length,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
