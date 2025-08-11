// Send a message to a sender using Twilio.
import axios from "axios";

axios.defaults.baseURL = "http://localhost:3000"; // Set your base URL

axios
  .post(
    "gawc/bookings/",
    {},
    {
      headers: {
        Authorization: "admin:root",
      },
    }
  )
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error.response?.data || error.message);
  });
