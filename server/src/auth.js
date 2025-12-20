export function requireAdmin(req, res, next) {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
        return res.status(500).json({error: "Server misconfigured: ADMIN_KEY not set"});
    }
    const provided = req.header("x-admin-key");
    if (!provided || provided !== adminKey) {
        return res.status(401).json({error: "Unauthorized"});
    }
    next();
}
