import app from "./app";
import config from "./config/config";
import { connectDB, disconnectDB, clearDB } from "./config/database";
import { findAvailableDates } from "./util/booker_util";
import { convertISOtoFriendly } from "./util/db_util";
import { sendMessageSMS } from "./util/phone_util";

app.listen(config.port, async () => {
  console.log(
    `Server running on port ${config.port} (http://localhost:${config.port})`
  );
  await connectDB();

  const env = process.env.NODE_ENV || "development";
  env === "production" ? await sendMessageSMS(process.env.DEV_PHONE?.toString() ?? "", `SRVR+DB CONNECTED ${convertISOtoFriendly(new Date().toISOString())}`):null;
});
