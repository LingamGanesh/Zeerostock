const mongoose = require("mongoose");
const logger = require("../utils/logger");
const config = require("./env");
async function connectDB() {
  mongoose.set("strictQuery", true);
  const connection = await mongoose.connect(config.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: !config.isProduction,
  });
  logger.info("MongoDB connected", { host: connection.connection.host, database: connection.connection.name });
  return connection;
}
module.exports = connectDB;
