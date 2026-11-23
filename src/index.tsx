// Must stay first: installs the mock API adapter before services create axios instances.
import "./mocks/setup";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { App } from "./App";
import { initPwaInstallPromptCapture } from "./utils/pwaInstallPrompt";

// A handful of screens call the bare `axios` import directly instead of going
// through a service's own axios.create() instance (which already sets this
// header individually). Setting it here on the shared default instance covers
// those call sites too — harmless once the API is off the ngrok tunnel.
axios.defaults.headers.common["ngrok-skip-browser-warning"] = "true";

initPwaInstallPromptCapture();

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
