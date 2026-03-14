"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/** Same key for list and detail within orders/support so the layout (e.g. left column) does not exit/enter when opening a chat. */
function getTransitionKey(pathname) {
  if (!pathname || typeof pathname !== "string") return pathname;
  return pathname.replace(
    /^(\/(?:en|ua|ru|es)\/dashboard\/(?:orders|support))\/[^/]+/,
    "$1"
  );
}

export default function Template({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getTransitionKey(pathname)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
