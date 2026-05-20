import axios from "axios";

const API_USER = process.env.VOIP_API_USERNAME;
const API_PASSWORD = process.env.VOIP_API_PASSWORD;
const DID = process.env.VOIP_DID;
const BASE_URL = "https://voip.ms/api/v1/rest.php";

export async function sendMessageMMS(to: string, body: string) {
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
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

export async function sendMessageSMS(to: string, body: string) {
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
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

export async function sendMessageToAdmin(body: string, type: string) {
  try {
    if (!type) {
      type = "SMS"; // Default to SMS if no type is provided
    }

    if (type !== "SMS" && type !== "MMS") {
      console.error("Invalid message type. Must be 'SMS' or 'MMS'.");
    }

    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: "send"+type.toUpperCase(),
        dst: process.env.ADMIN_PHONE, // Admin's phone number
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
  } catch (error) {
    console.error("Error sending message to admin:", error);
  }
}
