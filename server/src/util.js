import crypto from "crypto";

export function safeTrim(s, maxLen) {
    if (typeof s !== "string") return "";
    const t = s.trim();
    return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export function hashIp(ip) {
    const salt = process.env.IP_HASH_SALT || "default-salt";
    return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function uuid() {
    return crypto.randomUUID();
}
