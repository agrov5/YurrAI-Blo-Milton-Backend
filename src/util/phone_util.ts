import axios from "axios";

const API_USER = process.env.VOIP_API_USERNAME;
const API_PASSWORD = process.env.VOIP_API_PASSWORD;
const DID = process.env.VOIP_DID;
const BASE_URL = "https://voip.ms/api/v1/rest.php";

export async function sendMessage(to: string, body: string) {
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

export async function sendMessageToAdmin(body: string) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_username: API_USER,
        api_password: API_PASSWORD,
        method: "sendMMS",
        dst: "+14374243229",
        message: body,
        did: DID,
      },
    });
    console.log(response.data);
  } catch (error) {
    console.error("Error sending message to admin:", error);
  }
}
