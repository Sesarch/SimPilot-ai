import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen once React mounts
const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    const bar = document.getElementById("splash-bar");
    if (bar) bar.style.width = "100%";
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => splash.remove(), 400);
    }, 300);
  }
};

createRoot(document.getElementById("root")!).render(<App />);
hideSplash();
