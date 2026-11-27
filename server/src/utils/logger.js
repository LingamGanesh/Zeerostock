const winston = require("winston");
const config = require("../config/env");
module.exports = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  defaultMeta: { service: "zeerostock-api" },
  transports: [new winston.transports.Console()],
});
