import express from "express";
import rateLimit from "express-rate-limit";
import {db} from "./db.js";
import {hashIp, safeTrim, uuid} from "./util.js";
import {requireAdmin} from "./auth.js";


export const router = express.Router();

const createNoteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {error: "Too many requests, try again in a minute."},
});

router.get("/notes", (req, res) => {
    const rows = db.prepare(`
        SELECT id, name, message, created_at
        FROM notes
        WHERE status = 'approved'
        ORDER BY datetime(created_at) DESC LIMIT 200
    `).all();

    res.json({notes: rows});
});

router.post("/notes", createNoteLimiter, (req, res) => {
    const name = safeTrim(req.body?.name ?? "", 60);
    const message = safeTrim(req.body?.message ?? "", 2000);

    if (!message || message.length < 2) {
        return res.status(400).json({error: "Message is required."});
    }

    const ip = (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();

    const ipHash = ip ? hashIp(ip) : null;

    const id = uuid();
    const createdAt = new Date().toISOString();

    db.prepare(`
        INSERT INTO notes (id, name, message, status, ip_hash, created_at)
        VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(id, name || null, message, ipHash, createdAt);

    res.json({ok: true});
});

// --- admin ---
router.get("/admin/notes", requireAdmin, (req, res) => {
    const status = (req.query.status || "pending").toString();
    if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({error: "Invalid status"});
    }
    const rows = db.prepare(`
        SELECT id, name, message, status, created_at
        FROM notes
        WHERE status = ?
        ORDER BY datetime(created_at) DESC LIMIT 500
    `).all(status);

    res.json({notes: rows});
});

router.post("/admin/notes/:id/approve", requireAdmin, (req, res) => {
    const id = req.params.id;
    const info = db.prepare(`
        UPDATE notes
        SET status='approved'
        WHERE id = ?
          AND status != 'approved'
    `).run(id);

    res.json({ok: true, changed: info.changes});
});

router.post("/admin/notes/:id/reject", requireAdmin, (req, res) => {
    const id = req.params.id;
    const info = db.prepare(`
        UPDATE notes
        SET status='rejected'
        WHERE id = ?
          AND status != 'rejected'
    `).run(id);

    res.json({ok: true, changed: info.changes});
});
