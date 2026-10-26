import { StrictMode } from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ServerStatusProvider } from "./components/ServerStatus";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ServerStatusProvider>
                <App />
            </ServerStatusProvider>
        </BrowserRouter>
    </StrictMode>
);
