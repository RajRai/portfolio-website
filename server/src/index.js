import path from "path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import {initDb} from "./db.js";

import {router as notesRouter} from "./routes_notes.js";


dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5174);

initDb();

app.set("trust proxy", 1);

app.use(helmet({
    contentSecurityPolicy: false, // easier for a portfolio site; tighten later if you want
}));
app.use(compression());
app.use(express.json({limit: "1mb"}));

// Dev CORS: allow Vite dev origin to call /api
if (process.env.NODE_ENV !== "production") {
    const origin = process.env.DEV_CLIENT_ORIGIN || "http://localhost:5173";
    app.use(cors({origin, credentials: false}));
}

app.get("/api/health", (req, res) => res.json({ok: true}));

app.use("/api", notesRouter);

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
