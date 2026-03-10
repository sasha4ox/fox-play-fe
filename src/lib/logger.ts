import fs from "node:fs";
import path from "node:path";
import pino from "pino";

const pinoOptions = {
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
};

/** In serverless (e.g. Vercel) the filesystem is read-only; use stdout only. */
function createLoggerDestination():
  | ReturnType<typeof pino.multistream>
  | NodeJS.WritableStream {
  const isServerless =
    process.env.VERCEL === "1" ||
    typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string";
  if (isServerless) {
    return process.stdout;
  }
  try {
    const logsDir = path.join(process.cwd(), "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    const appStream = fs.createWriteStream(path.join(logsDir, "app.log"), { flags: "a" });
    const errorStream = fs.createWriteStream(path.join(logsDir, "error.log"), { flags: "a" });
    return pino.multistream([
      { stream: appStream },
      { level: "error" as const, stream: errorStream },
    ]);
  } catch {
    return process.stdout;
  }
}

export const logger = pino(pinoOptions, createLoggerDestination());
