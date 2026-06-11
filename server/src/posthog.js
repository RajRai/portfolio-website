const POSTHOG_PROXY_PATH = "/_relay";
const POSTHOG_DEFAULTS = "2026-01-30";

const REGION_DEFAULTS = {
    us: {
        apiHost: "https://us.i.posthog.com",
        assetHost: "https://us-assets.i.posthog.com",
        uiHost: "https://us.posthog.com",
    },
    eu: {
        apiHost: "https://eu.i.posthog.com",
        assetHost: "https://eu-assets.i.posthog.com",
        uiHost: "https://eu.posthog.com",
    },
};

function trimTrailingSlash(value) {
    return value ? value.replace(/\/+$/, "") : value;
}

function getDefaultHosts() {
    const region = (process.env.POSTHOG_REGION || "us").trim().toLowerCase();
    return REGION_DEFAULTS[region] || REGION_DEFAULTS.us;
}

function getPostHogHosts() {
    const defaults = getDefaultHosts();
    const apiHost = trimTrailingSlash(process.env.POSTHOG_API_HOST || defaults.apiHost);
    const assetHost = trimTrailingSlash(process.env.POSTHOG_ASSET_HOST || defaults.assetHost || apiHost);
    const uiHost = trimTrailingSlash(process.env.POSTHOG_UI_HOST || defaults.uiHost);

    return {apiHost, assetHost, uiHost};
}

function getClientIp(req) {
    return (req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();
}

function getForwardedFor(req, clientIp) {
    const forwarded = req.headers["x-forwarded-for"];
    if (!forwarded) return clientIp;
    return `${forwarded}, ${clientIp}`;
}

function copyRequestHeaders(req, upstreamHost) {
    const headers = new Headers();

    for (const [name, value] of Object.entries(req.headers)) {
        if (value == null) continue;

        if (Array.isArray(value)) {
            value.forEach((item) => headers.append(name, item));
        } else {
            headers.set(name, value);
        }
    }

    headers.set("host", upstreamHost);

    if (req.headers.host) {
        headers.set("x-forwarded-host", req.headers.host);
    }

    const clientIp = getClientIp(req);
    if (clientIp) {
        headers.set("x-real-ip", clientIp);
        headers.set("x-forwarded-for", getForwardedFor(req, clientIp));
    }

    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("cookie");

    return headers;
}

function applyResponseHeaders(res, upstreamHeaders) {
    upstreamHeaders.forEach((value, name) => {
        if (["connection", "content-encoding", "content-length", "transfer-encoding"].includes(name)) {
            return;
        }

        res.setHeader(name, value);
    });
}

function getUpstreamRequest(req) {
    const {apiHost, assetHost} = getPostHogHosts();
    const currentUrl = new URL(req.originalUrl || req.url || "", `http://${req.headers.host || "localhost"}`);
    const proxiedPath = currentUrl.pathname.slice(POSTHOG_PROXY_PATH.length) || "/";
    const useAssetHost = proxiedPath.startsWith("/array/") || proxiedPath.startsWith("/static/");
    const upstreamBase = new URL(useAssetHost ? assetHost : apiHost);
    const upstreamUrl = new URL(`${proxiedPath}${currentUrl.search}`, upstreamBase);

    return {
        upstreamHost: upstreamBase.host,
        upstreamUrl,
    };
}

export function getPostHogClientConfig() {
    const projectToken = (process.env.POSTHOG_PROJECT_TOKEN || "").trim();

    if (!projectToken) {
        return {enabled: false};
    }

    const {uiHost} = getPostHogHosts();

    return {
        enabled: true,
        projectToken,
        apiHost: POSTHOG_PROXY_PATH,
        uiHost,
        defaults: POSTHOG_DEFAULTS,
    };
}

export function createPostHogProxy() {
    return async (req, res, next) => {
        const requestUrl = req.originalUrl || req.url || "";
        if (!requestUrl.startsWith(POSTHOG_PROXY_PATH)) {
            next();
            return;
        }

        try {
            const {upstreamHost, upstreamUrl} = getUpstreamRequest(req);
            const method = (req.method || "GET").toUpperCase();
            const headers = copyRequestHeaders(req, upstreamHost);
            const init = {
                method,
                headers,
                redirect: "manual",
            };

            if (!["GET", "HEAD"].includes(method)) {
                init.body = req;
                init.duplex = "half";
            }

            const upstreamResponse = await fetch(upstreamUrl, init);
            res.status(upstreamResponse.status);
            applyResponseHeaders(res, upstreamResponse.headers);

            const body = Buffer.from(await upstreamResponse.arrayBuffer());
            res.send(body);
        } catch (error) {
            next(error);
        }
    };
}

export {POSTHOG_PROXY_PATH};
