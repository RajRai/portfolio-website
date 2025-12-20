import React, {useEffect, useMemo, useState} from "react";
import {
    Alert,
    AppBar,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    Stack,
    TextField,
    Toolbar,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {approveNote, fetchAdminNotes, rejectNote} from "./api";

function AdminKeyGate({adminKey, setAdminKey}) {
    const [local, setLocal] = useState(adminKey || "");

    function save() {
        const k = local.trim();
        setAdminKey(k);
        if (k) localStorage.setItem("portfolio-website-admin-key", k);
        else localStorage.removeItem("portfolio-website-admin-key");
    }

    return (
        <Card variant="outlined">
            <CardContent>
                <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={800}>Admin</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enter your admin key (sent as <code>x-admin-key</code>).
                    </Typography>
                    <TextField
                        label="Admin key"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        fullWidth
                        size="small"
                        type="password"
                        autoComplete="off"
                    />
                    <Box sx={{display: "flex", justifyContent: "flex-end", gap: 1}}>
                        <Button variant="outlined" onClick={() => {
                            setLocal("");
                            setAdminKey("");
                            localStorage.removeItem("portfolio-website-admin-key");
                        }}>
                            Clear
                        </Button>
                        <Button variant="contained" onClick={save}>
                            Save
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function AdminPage() {
    const [adminKey, setAdminKey] = useState(() => localStorage.getItem("portfolio-website-admin-key") || "");
    const [status, setStatus] = useState("pending");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notes, setNotes] = useState([]);

    const [actionBusy, setActionBusy] = useState({}); // id -> boolean

    const canQuery = useMemo(() => !!adminKey, [adminKey]);

    async function load() {
        if (!adminKey) return;
        setBusy(true);
        setError("");
        try {
            const data = await fetchAdminNotes({status, adminKey});
            setNotes(data.notes || []);
        } catch (e) {
            setError(e?.message || "Failed to load");
            setNotes([]);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, adminKey]);

    async function doAction(id, kind) {
        setActionBusy((m) => ({...m, [id]: true}));
        setError("");
        try {
            if (kind === "approve") await approveNote({id, adminKey});
            else await rejectNote({id, adminKey});

            // optimistic remove from list
            setNotes((prev) => prev.filter((n) => n.id !== id));
        } catch (e) {
            setError(e?.message || "Action failed");
        } finally {
            setActionBusy((m) => ({...m, [id]: false}));
        }
    }

    return (
        <Box sx={{minHeight: "100vh", display: "flex", flexDirection: "column"}}>
            <AppBar position="sticky" elevation={0} color="transparent" sx={{borderBottom: 1, borderColor: "divider"}}>
                <Toolbar>
                    <Container maxWidth="lg" sx={{display: "flex", alignItems: "center"}}>
                        <Typography variant="h6" fontWeight={800} sx={{flex: 1}}>
                            Portfolio Hub — Admin
                        </Typography>

                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={status}
                            onChange={(_, v) => v && setStatus(v)}
                        >
                            <ToggleButton value="pending">Pending</ToggleButton>
                            <ToggleButton value="approved">Approved</ToggleButton>
                            <ToggleButton value="rejected">Rejected</ToggleButton>
                        </ToggleButtonGroup>

                        <Button sx={{ml: 2}} variant="outlined" onClick={load} disabled={!adminKey || busy}>
                            Refresh
                        </Button>
                    </Container>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{py: 3, flex: 1}}>
                <AdminKeyGate adminKey={adminKey} setAdminKey={setAdminKey}/>

                {error ? (
                    <Alert severity="error" sx={{mt: 2}}>
                        {error}
                    </Alert>
                ) : null}

                <Divider sx={{my: 3}}/>

                {!canQuery ? (
                    <Typography variant="body2" color="text.secondary">
                        Enter an admin key to load notes.
                    </Typography>
                ) : busy ? (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <CircularProgress size={18}/>
                        <Typography variant="body2" color="text.secondary">
                            Loading…
                        </Typography>
                    </Stack>
                ) : notes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No notes in <b>{status}</b>.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {notes.map((n) => (
                            <Card key={n.id} variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={800}>
                                        {n.name || "Anonymous"}{" "}
                                        <Typography component="span" variant="caption" color="text.secondary">
                                            • {new Date(n.created_at).toLocaleString()} • {n.status}
                                        </Typography>
                                    </Typography>

                                    <Typography variant="body2" sx={{mt: 1, whiteSpace: "pre-wrap"}}>
                                        {n.message}
                                    </Typography>
                                </CardContent>

                                {status === "pending" ? (
                                    <CardActions sx={{px: 2, pb: 2, justifyContent: "flex-end", gap: 1}}>
                                        <Button
                                            color="error"
                                            variant="outlined"
                                            onClick={() => doAction(n.id, "reject")}
                                            disabled={!!actionBusy[n.id]}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={() => doAction(n.id, "approve")}
                                            disabled={!!actionBusy[n.id]}
                                        >
                                            Approve
                                        </Button>
                                    </CardActions>
                                ) : null}
                            </Card>
                        ))}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}
