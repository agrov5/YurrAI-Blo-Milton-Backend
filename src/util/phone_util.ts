import axios from "axios";
import { logMessage } from "../models/MessageLog";

const API_USER = process.env.VOIP_API_USERNAME;
const API_PASSWORD = process.env.VOIP_API_PASSWORD;
const DID = process.env.VOIP_DID;
const BASE_URL = "https://voip.ms/api/v1/rest.php";

// voip.ms returns { status: "success" } on a successful send; anything else
// (e.g. "invalid_credentials") indicates a failure.
function wasSuccessful(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { status?: string }).status === "success"
  );
}

/**
 * Generic send used by the dashboard compose form. Sends an SMS/MMS to any
 * destination number and logs it — `logMessage` derives the recipientType
 * (admin/dev/customer) from the number, so admin/dev sends are tagged correctly.
 * Returns whether voip.ms accepted the message.
 */
export async function sendMessage(
  to: string,
  body: string,
  messageType: "SMS" | "MMS" = "SMS",
): Promise<boolean> {
  let success = false;
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: messageType === "MMS" ? "sendMMS" : "sendSMS",
        dst: to,
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
    success = wasSuccessful(response.data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
  await logMessage({ messageType, messageBody: body, to, success });
  return success;
}

export async function sendMessageMMS(to: string, body: string) {
  let success = false;
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: "sendMMS",
        dst: to,
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
    success = wasSuccessful(response.data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
  await logMessage({
    messageType: "MMS",
    messageBody: body,
    to,
    recipientType: "customer",
    success,
  });
}

export async function sendMessageSMS(to: string, body: string) {
  let success = false;
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: "sendSMS",
        dst: to,
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
    success = wasSuccessful(response.data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
  await logMessage({
    messageType: "SMS",
    messageBody: body,
    to,
    recipientType: "customer",
    success,
  });
}

export async function sendMessageToAdmin(body: string, type: string) {
  let normalizedType: "SMS" | "MMS" = "SMS";
  let success = false;
  const adminPhone = process.env.ADMIN_PHONE ?? "";
  try {
    if (!type) {
      type = "SMS"; // Default to SMS if no type is provided
    }

    if (type !== "SMS" && type !== "MMS") {
      console.error("Invalid message type. Must be 'SMS' or 'MMS'.");
    }

    normalizedType = type.toUpperCase() === "MMS" ? "MMS" : "SMS";

    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: "send" + normalizedType,
        dst: adminPhone, // Admin's phone number
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
    success = wasSuccessful(response.data);
  } catch (error) {
    console.error("Error sending message to admin:", error);
  }
  await logMessage({
    messageType: normalizedType,
    messageBody: body,
    to: adminPhone,
    recipientType: "admin",
    success,
  });
}
