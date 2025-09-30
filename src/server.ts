import app from "./app";
import config from "./config/config";
import { connectDB, disconnectDB, clearDB } from "./config/database";
import { findAvailableDates } from "./util/booker_util";

app.listen(config.port, async () => {
  console.log(
    `Server running on port ${config.port} (http://localhost:${config.port})`
  );
  await connectDB();
});
