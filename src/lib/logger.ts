import fs from "node:fs";
import path from "node:path";
import pino from "pino";

const logsDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });

const appStream = fs.createWriteStream(path.join(logsDir, "app.log"), { flags: "a" });
const errorStream = fs.createWriteStream(path.join(logsDir, "error.log"), { flags: "a" });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "password",
        "token",
        "*.password",
        "*.token",
        "*.creditCard",
        "*.cardNumber",
        "cardNumber",
      ],
      remove: true,
    },
  },
  pino.multistream([
    { stream: appStream },
    { level: "error" as const, stream: errorStream },
  ]),
);
