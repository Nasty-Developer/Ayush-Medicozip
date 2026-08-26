/**
 * useOnlineStatus
 * ─────────────────────────────────────────────────────────────────────────────
 * Reactively tracks whether the browser has an internet connection by listening
 * to the `online` and `offline` window events.
 *
 * Returns true when online, false when offline.
 * Initial value comes from navigator.onLine (always available).
 */

import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    // navigator.onLine is synchronously available — safe for SSR-free apps
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync with current state in case it changed between render and effect
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
