import { Request, Response } from "express";
import { sendMessage, sendMessageToAdmin } from "../util/twillo_util";

export const twilioController = async (req: Request, res: Response) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res
        .status(400)
        .json({ message: "Both 'to' and 'body' fields are required." });
    }

    await sendMessage(to, body);
    res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
};

export const sendMessageToAdminController = async (
  req: Request,
  res: Response
) => {
  try {
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({ message: "'body' field is required." });
    }
    await sendMessageToAdmin(body).then(() => {
      res.status(200).json({ message: "Message sent to admin successfully." });
    });
  } catch (error) {
    console.error("Error sending message to admin:", error);
    res.status(500).json({ message: "Failed to send message to admin." });
  }
};
export const twilioControllerFromParams = async (
  req: Request,
  res: Response
) => {
  try {
    const { to, body } = req.params;

    if (!to || !body) {
      return res.status(400).json({
        message: "Both 'to' and 'body' parameters are required in the URL.",
      });
    }

    // Decode the body parameter in case it contains URL-encoded characters
    const decodedBody = decodeURIComponent(body);

    await sendMessage(to, decodedBody);
    res.status(200).json({
      message: "Message sent successfully.",
      sentTo: to,
      messageBody: decodedBody,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
};
