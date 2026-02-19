import { Request, Response } from "express";
import {
  sendMessageMMS,
  sendMessageSMS,
  sendMessageToAdmin,
} from "../util/phone_util";

export const phoneController = async (req: Request, res: Response) => {
  try {
    const { to, body, messageType } = req.body;
    if (!to || !body || !messageType) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient number, message body, and message type (SMS or MMS) are required",
      });
    }

    if (messageType === "SMS") {
      await sendMessageSMS(to, body);
      res.status(200).json({
        success: true,
        message: "SMS sent successfully",
        to: to,
        messageLength: body.length,
      });
    } else if (messageType === "MMS") {
      await sendMessageMMS(to, body);
      res.status(200).json({
        success: true,
        message: "MMS sent successfully",
        to: to,
        messageLength: body.length,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid message type. Must be 'SMS' or 'MMS'.",
      });
    }
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
