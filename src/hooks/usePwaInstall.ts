import { useCallback, useEffect, useState } from "react";
import {
  clearCachedInstallPrompt,
  getCachedInstallPrompt,
  subscribeInstallPrompt,
} from "../utils/pwaInstallPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_UNTIL_KEY = "mnm_receive_pwa_install_dismissed_until";
const LEGACY_DISMISS_KEY = "mnm_receive_pwa_install_dismissed";
const DISMISS_DAYS = 7;

function readDismissed(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_UNTIL_KEY);
    if (until) {
      if (Date.now() < Number(until)) return true;
      localStorage.removeItem(DISMISS_UNTIL_KEY);
    }
    // Clear old permanent dismiss so the banner can show again
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // ignore storage errors
  }
  return false;
}

function markDismissed(): void {
  const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_UNTIL_KEY, String(until));
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function usePwaInstall(enabled: boolean) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    getCachedInstallPrompt(),
  );
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!enabled || dismissed) return;
    return subscribeInstallPrompt(setDeferredPrompt);
  }, [enabled, dismissed]);

  const dismiss = useCallback(() => {
    markDismissed();
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt ?? getCachedInstallPrompt();
    if (!prompt) return false;
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearCachedInstallPrompt();
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        markDismissed();
        setDismissed(true);
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const eligible =
    enabled && isMobileDevice() && !isStandaloneApp() && !dismissed;

  const showInstallButton = eligible && deferredPrompt != null;
  const showIosHint = eligible && isIosDevice();
  const showAndroidHint = eligible && isAndroidDevice() && !deferredPrompt && !isIosDevice();
  const showBanner = showInstallButton || showIosHint || showAndroidHint;

  return {
    showBanner,
    showInstallButton,
    showIosHint,
    showAndroidHint,
    installing,
    install,
    dismiss,
  };
};
