import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initConsoleSanitizer } from "./lib/consoleSanitizer";

// Initialize console sanitizer to filter sensitive data in production
initConsoleSanitizer();

createRoot(document.getElementById("root")!).render(<App />);
