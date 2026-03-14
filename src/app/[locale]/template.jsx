"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/** Same key for all dashboard routes so switching Sales/Balance/Orders etc. does not trigger transition—only entering or leaving dashboard does. */
function getTransitionKey(pathname) {
  if (!pathname || typeof pathname !== "string") return pathname;
  return pathname.replace(/^(\/(?:en|ua|ru|es)\/dashboard)(?:\/.*)?$/, "$1");
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
