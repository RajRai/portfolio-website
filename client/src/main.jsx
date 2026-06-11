import React from "react";
import ReactDOM from "react-dom/client";
import {CssBaseline} from "@mui/material";
import {ThemeManagerProvider, ThemeEditorModal, allPresets} from "@rajrai/mui-theme-manager";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {PostHogProvider} from "@posthog/react";

import App from "./App.jsx";
import AdminPage from "./AdminPage.jsx";
import {initializePostHog, posthog} from "./posthog.js";

async function bootstrap() {
    await initializePostHog();

    ReactDOM.createRoot(document.getElementById("root")).render(
        <React.StrictMode>
            <PostHogProvider client={posthog}>
                <ThemeManagerProvider presets={allPresets}>
                    <CssBaseline/>
                    <ThemeEditorModal/>

                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<App/>}/>
                            <Route path="/admin" element={<AdminPage/>}/>
                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Routes>
                    </BrowserRouter>
                </ThemeManagerProvider>
            </PostHogProvider>
        </React.StrictMode>
    );
}

bootstrap();
