import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const dataDir = path.join("data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");
export const db = new Database(dbPath);

// Basic pragmas for a small app
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            name TEXT,
            message TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
            ip_hash TEXT,
            created_at TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_notes_status_created
        ON notes(status, created_at DESC);
    `);
}
