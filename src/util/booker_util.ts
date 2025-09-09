import axios from "axios";

const generateAccessToken = async () => {
  try {
    // Header: {"Content-Type": "application/x-www-form-urlencoded", "Ocp-Apim-Subscription-Key": "your_subscription_key"}
    // Body: {"grant_type": "personal_access_token", "client_id": "your_client_id", "client_secret": "your_client_secret", "scope": "merchant", "personal_access_token": "your_personal_access_token"}

    const response = await axios.post(
      "v5/auth/connect/token",
      {
        grant_type: "personal_access_token",
        client_id: process.env.BOOKER_CLIENT_ID,
        client_secret: process.env.BOOKER_CLIENT_SECRET,
        scope: "merchant",
        personal_access_token: process.env.BOOKER_PERSONAL_ACCESS_TOKEN,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw error;
  }
};

// Remove global accessToken, generate per function
export const locationID = 3749;

export const findEmployees = async () => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "/v4.1/merchant/employees",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error finding employees:", error);
    throw error;
  }
};

export const findTreatments = async () => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "v4.1/merchant/treatments",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error finding treatments:", error);
    throw error;
  }
};

export const findRooms = async () => {
  try {
    const accessToken = await generateAccessToken();
    const response = await axios.post(
      "v4.1/merchant/rooms",
      {
        access_token: accessToken,
        LocationID: locationID,
      },
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BOOKER_SUBSCRIPTION_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error finding rooms:", error);
    throw error;
  }
};
