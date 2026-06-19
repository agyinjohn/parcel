/** Capture install prompt as early as possible (before React mounts). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let cachedInstallPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

export function initPwaInstallPromptCapture(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    cachedInstallPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach(listener => listener(cachedInstallPrompt));
  });

  window.addEventListener("appinstalled", () => {
    cachedInstallPrompt = null;
    promptListeners.forEach(listener => listener(null));
  });
}

export function getCachedInstallPrompt(): BeforeInstallPromptEvent | null {
  return cachedInstallPrompt;
}

export function subscribeInstallPrompt(listener: (prompt: BeforeInstallPromptEvent | null) => void): () => void {
  promptListeners.add(listener);
  listener(cachedInstallPrompt);
  return () => promptListeners.delete(listener);
}

export function clearCachedInstallPrompt(): void {
  cachedInstallPrompt = null;
}
