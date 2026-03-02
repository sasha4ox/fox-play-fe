import { useAuthStore } from "@/store/authStore";

export function logClientError(error: unknown): void {
  const user = useAuthStore.getState()?.user;
  const payload: Record<string, unknown> = {
    message: String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: typeof location !== "undefined" ? location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    time: new Date().toISOString(),
  };
  if (user) {
    payload.userId = user.id;
    payload.userEmail = user.email;
    if ("role" in user && user.role) payload.userRole = user.role;
  }
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
