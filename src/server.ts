import app from "./app";
import config from "./config/config";
import { connectDB, disconnectDB, clearDB } from "./config/database";
import { DatabaseReceptionistName } from "./models/Types";

app.listen(config.port, async () => {
  console.log(`Server running on port ${config.port}`);
  await connectDB();
});
