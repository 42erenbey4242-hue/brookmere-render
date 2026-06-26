import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { setupFirebase } from "./store";
import { getEnvFirebaseConfig } from "./firebase";
import { getStoredFirebaseConfig } from "./components/FirebaseSetup";

// Firebase'i uygulama başlamadan önce başlat
// Bu sayede useAppState hook'u mount olduğunda Firebase zaten hazır olur
(function initFirebaseEarly() {
  // 1. Render env değişkenlerinden dene
  const envConfig = getEnvFirebaseConfig();
  if (envConfig) {
    setupFirebase(envConfig);
    return;
  }
  // 2. localStorage'dan dene
  const storedConfig = getStoredFirebaseConfig();
  if (storedConfig && storedConfig.apiKey && storedConfig.databaseURL) {
    setupFirebase(storedConfig);
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
