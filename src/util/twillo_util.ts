// Send a message to a sender using Twilio.
import axios, { Axios } from "axios";

axios.defaults.baseURL = "http://localhost:3000"; // Set your base URL

axios
  .get("gawc/bookings/", {
    headers: {
      Authorization: "admin:root",
    },
  })
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error);
  });
