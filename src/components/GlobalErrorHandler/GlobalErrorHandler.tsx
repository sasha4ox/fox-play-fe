"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/clientLogger";

export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      logClientError(e.error ?? e.message);
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      logClientError(e.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
