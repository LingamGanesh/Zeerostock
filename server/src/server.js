const app = require("./app");
const connectDB = require("./config/db");
const config = require("./config/env");
const logger = require("./utils/logger");
let server;

async function startServer() {
  await connectDB();
  server = app.listen(config.PORT, () => logger.info("Zeerostock API listening", {
    port: config.PORT, environment: config.NODE_ENV,
  }));
}

async function shutdown(signal) {
  logger.info("Shutdown signal received", { signal });
  if (!server) return process.exit(0);
  server.close(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
startServer().catch((error) => {
  logger.error("Application startup failed", { message: error.message, stack: error.stack });
  process.exit(1);
});
