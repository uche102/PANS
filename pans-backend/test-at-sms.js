import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const phone = "+2349132174851"; // replace with your own number

const response = await axios.post(
  "https://api.africastalking.com/version1/messaging",
  new URLSearchParams({
    username: process.env.AT_USERNAME,
    to: phone,
    message: "Your PANS Election verification code is 123456. It expires in 5 minutes.",
  }),
  {
    headers: {
      apiKey: process.env.AT_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  }
);

console.log(JSON.stringify(response.data, null, 2));
