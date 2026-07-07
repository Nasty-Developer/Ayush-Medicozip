/**
 * usePWAInstall
 * ─────────────────────────────────────────────────────────────────────────────
 * Captures the browser's `beforeinstallprompt` event so we can trigger the
 * PWA install dialog at a time of our choosing (e.g. when the user clicks our
 * custom "Install App" button) instead of relying on the browser's default
 * timing.
 *
 * Returns:
 *   isInstallable  – true when the browser has a deferred prompt ready
 *   isInstalled    – true when the app is already running as a standalone PWA
 *   install()      – trigger the install prompt; resolves to true if accepted
 */

import { useCallback, useEffect, useState } from "react";

/** Minimal typing for the non-standard BeforeInstallPromptEvent. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export interface UsePWAInstallReturn {
  /** Browser has a deferred install prompt ready. */
  isInstallable: boolean;
  /** App is already installed / running in standalone mode. */
  isInstalled: boolean;
  /** Trigger the install prompt. Returns true if the user accepted. */
  install: () => Promise<boolean>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [prompt, setPrompt]           = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setInstallable] = useState(false);
  const [isInstalled, setInstalled]     = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    if (standaloneQuery.matches || (navigator as any).standalone === true) {
      setInstalled(true);
      return; // No need to listen for the prompt
    }

    /** Store the event so we can call .prompt() later. */
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar on mobile Chrome
      setPrompt(e as BeforeInstallPromptEvent);
      setInstallable(true);
    };

    /** The app was just installed via any means. */
    const onInstalled = () => {
      setInstalled(true);
      setInstallable(false);
      setPrompt(null);
    };

    /** Track when the app enters/exits standalone mode (e.g. after install). */
    const onDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInstalled(true);
        setInstallable(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    standaloneQuery.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setInstallable(false);
        setPrompt(null);
      }
      return outcome === "accepted";
    } catch (err) {
      console.error("[PWA] install error:", err);
      return false;
    }
  }, [prompt]);

  return { isInstallable, isInstalled, install };
}
