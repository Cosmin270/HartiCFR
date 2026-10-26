import { StrictMode } from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ServerStatusProvider } from "./components/ServerStatus";
import { ToastProvider } from "./components/Toast";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ServerStatusProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </ServerStatusProvider>
        </BrowserRouter>
    </StrictMode>
);
