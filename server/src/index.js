import path from "path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import {initDb} from "./db.js";

import {router as notesRouter} from "./routes_notes.js";
import {createPostHogProxy, getPostHogClientConfig, POSTHOG_PROXY_PATH} from "./posthog.js";


dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5174);

initDb();

app.set("trust proxy", 1);

app.use(helmet({
    contentSecurityPolicy: false, // easier for a portfolio site; tighten later if you want
}));
app.use(compression());

// Dev CORS: allow the Vite dev origin to call backend APIs and the PostHog proxy.
if (process.env.NODE_ENV !== "production") {
    const origin = process.env.DEV_CLIENT_ORIGIN || "http://localhost:5173";
    app.use(cors({origin, credentials: false}));
}

// Keep the PostHog proxy ahead of JSON parsing so request bodies stream through untouched.
app.use(createPostHogProxy());
app.use(express.json({limit: "1mb"}));

app.get("/api/health", (req, res) => res.json({ok: true}));
app.get("/api/posthog/config", (req, res) => res.json(getPostHogClientConfig()));
app.use("/api", notesRouter);

app.use((err, req, res, next) => {
    const requestUrl = req.originalUrl || req.url || "";
    if (!requestUrl.startsWith(POSTHOG_PROXY_PATH)) {
        next(err);
        return;
    }

    console.error("PostHog proxy error", err);
    res.status(502).json({error: "PostHog proxy error"});
});

// Serve static client build in production
const clientDist = path.resolve(path.join("..", "client", "dist"));
app.use(express.static(clientDist));

app.get("*", (req, res) => {
    // If client isn't built, show a helpful message
    const indexPath = path.join(clientDist, "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) {
            res
                .status(404)
                .send("Client not built. In dev, run `npm run dev`. For prod, run `npm run build` then `npm start`.");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
