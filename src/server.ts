import app from "./app";
import config from "./config/config";
import { connectDB, disconnectDB, clearDB } from "./config/database";
import { please_work } from "./util/db_util";

app.listen(config.port, async () => {
  console.log(
    `Server running on port ${config.port} (http://localhost:${config.port})`,
  );
  await connectDB();
  please_work();
});
