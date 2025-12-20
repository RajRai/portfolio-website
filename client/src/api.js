const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, {method = "GET", body, headers} = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            ...(body ? {"content-type": "application/json"} : {}),
            ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
}

/* ========= PUBLIC ========= */

export async function fetchNotes() {
    return request("/notes");
}

export async function submitNote({name, message}) {
    return request("/notes", {method: "POST", body: {name, message}});
}

/* ========= ADMIN ========= */

export async function fetchAdminNotes({status = "pending", adminKey}) {
    if (!adminKey) throw new Error("Missing admin key");
    return request(`/admin/notes?status=${encodeURIComponent(status)}`, {
        headers: {"x-admin-key": adminKey},
    });
}

export async function approveNote({id, adminKey}) {
    if (!adminKey) throw new Error("Missing admin key");
    return request(`/admin/notes/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: {"x-admin-key": adminKey},
    });
}

export async function rejectNote({id, adminKey}) {
    if (!adminKey) throw new Error("Missing admin key");
    return request(`/admin/notes/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: {"x-admin-key": adminKey},
    });
}
