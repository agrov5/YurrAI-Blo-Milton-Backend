import axios from "axios";

const accessToken = process.env.ACCESS_TOKEN;
const locationID = 3749;

export const findEmployees = async () => {
  try {
    const response = await axios.post("/v4.1/merchant/employees", {
      access_token: accessToken,
      LocationID: locationID,
    });
    return response.data;
  } catch (error) {
    console.error("Error finding employees:", error);
    throw error;
  }
};

export const findTreatments = async () => {
  try {
    const response = await axios.post("v4.1/merchant/treatments", {
      access_token: accessToken,
      LocationID: locationID,
    });
    return response.data;
  } catch (error) {
    console.error("Error finding treatments:", error);
    throw error;
  }
};

export const findRooms = async () => {
  try {
    const response = await axios.post("v4.1/merchant/rooms", {
      access_token: accessToken,
      LocationID: locationID,
    });
    return response.data;
  } catch (error) {
    console.error("Error finding rooms:", error);
    throw error;
  }
};
