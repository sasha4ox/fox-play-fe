export function logClientError(error: unknown): void {
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: typeof location !== "undefined" ? location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      time: new Date().toISOString(),
    }),
  }).catch(() => {});
}
