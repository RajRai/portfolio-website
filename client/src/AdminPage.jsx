import React, {useEffect, useMemo, useRef, useState} from "react";
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
import {usePostHog} from "@posthog/react";

import {approveNote, fetchAdminNotes, rejectNote} from "./api";

function AdminKeyGate({adminKey, setAdminKey, onKeySaved, onKeyCleared}) {
    const [local, setLocal] = useState(adminKey || "");

    function save() {
        const key = local.trim();
        setAdminKey(key);

        if (key) {
            localStorage.setItem("portfolio-website-admin-key", key);
        } else {
            localStorage.removeItem("portfolio-website-admin-key");
        }

        onKeySaved(Boolean(key));
    }

    function clear() {
        setLocal("");
        setAdminKey("");
        localStorage.removeItem("portfolio-website-admin-key");
        onKeyCleared();
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
                        <Button variant="outlined" onClick={clear}>
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
    const posthog = usePostHog();
    const hasCapturedAuthRef = useRef(false);

    const [adminKey, setAdminKey] = useState(() => localStorage.getItem("portfolio-website-admin-key") || "");
    const [status, setStatus] = useState("pending");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notes, setNotes] = useState([]);

    const [actionBusy, setActionBusy] = useState({});

    const canQuery = useMemo(() => !!adminKey, [adminKey]);

    async function load(source = "auto") {
        if (!adminKey) return;

        setBusy(true);
        setError("");

        try {
            const data = await fetchAdminNotes({status, adminKey});
            const loadedNotes = data.notes || [];
            setNotes(loadedNotes);

            posthog.capture("admin_notes_loaded", {
                source,
                status,
                note_count: loadedNotes.length,
            });

            if (!hasCapturedAuthRef.current) {
                hasCapturedAuthRef.current = true;
                posthog.capture("admin_authenticated", {
                    source,
                    status,
                });
            }
        } catch (loadError) {
            const errorMessage = loadError?.message || "Failed to load";
            setError(errorMessage);
            setNotes([]);
            posthog.capture("admin_notes_load_failed", {
                source,
                status,
                reason: errorMessage,
            });
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        load("auto");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, adminKey]);

    async function doAction(id, kind) {
        setActionBusy((map) => ({...map, [id]: true}));
        setError("");

        try {
            if (kind === "approve") {
                await approveNote({id, adminKey});
            } else {
                await rejectNote({id, adminKey});
            }

            setNotes((prev) => prev.filter((note) => note.id !== id));
            posthog.capture("admin_note_moderated", {
                action: kind,
                status_view: status,
            });
        } catch (actionError) {
            const errorMessage = actionError?.message || "Action failed";
            setError(errorMessage);
            posthog.capture("admin_note_moderation_failed", {
                action: kind,
                status_view: status,
                reason: errorMessage,
            });
        } finally {
            setActionBusy((map) => ({...map, [id]: false}));
        }
    }

    function handleStatusChange(_, nextStatus) {
        if (!nextStatus || nextStatus === status) return;

        setStatus(nextStatus);
        posthog.capture("admin_status_filter_changed", {
            status: nextStatus,
        });
    }

    function handleAdminKeySaved(hasKey) {
        posthog.capture("admin_key_saved", {
            has_key: hasKey,
        });

        if (!hasKey) {
            hasCapturedAuthRef.current = false;
        }
    }

    function handleAdminKeyCleared() {
        hasCapturedAuthRef.current = false;
        posthog.capture("admin_key_cleared");
    }

    return (
        <Box sx={{minHeight: "100vh", display: "flex", flexDirection: "column"}}>
            <AppBar position="sticky" elevation={0} color="transparent" sx={{borderBottom: 1, borderColor: "divider"}}>
                <Toolbar>
                    <Container maxWidth="lg" sx={{display: "flex", alignItems: "center"}}>
                        <Typography variant="h6" fontWeight={800} sx={{flex: 1}}>
                            Portfolio Hub - Admin
                        </Typography>

                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={status}
                            onChange={handleStatusChange}
                        >
                            <ToggleButton value="pending">Pending</ToggleButton>
                            <ToggleButton value="approved">Approved</ToggleButton>
                            <ToggleButton value="rejected">Rejected</ToggleButton>
                        </ToggleButtonGroup>

                        <Button
                            sx={{ml: 2}}
                            variant="outlined"
                            onClick={() => load("manual")}
                            disabled={!adminKey || busy}
                        >
                            Refresh
                        </Button>
                    </Container>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{py: 3, flex: 1}}>
                <AdminKeyGate
                    adminKey={adminKey}
                    setAdminKey={setAdminKey}
                    onKeySaved={handleAdminKeySaved}
                    onKeyCleared={handleAdminKeyCleared}
                />

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
                            Loading...
                        </Typography>
                    </Stack>
                ) : notes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No notes in <b>{status}</b>.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {notes.map((note) => (
                            <Card key={note.id} variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={800}>
                                        {note.name || "Anonymous"}{" "}
                                        <Typography component="span" variant="caption" color="text.secondary">
                                            - {new Date(note.created_at).toLocaleString()} - {note.status}
                                        </Typography>
                                    </Typography>

                                    <Typography variant="body2" sx={{mt: 1, whiteSpace: "pre-wrap"}}>
                                        {note.message}
                                    </Typography>
                                </CardContent>

                                {status === "pending" ? (
                                    <CardActions sx={{px: 2, pb: 2, justifyContent: "flex-end", gap: 1}}>
                                        <Button
                                            color="error"
                                            variant="outlined"
                                            onClick={() => doAction(note.id, "reject")}
                                            disabled={Boolean(actionBusy[note.id])}
                                            data-ph-capture-attribute-admin-action="reject"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={() => doAction(note.id, "approve")}
                                            disabled={Boolean(actionBusy[note.id])}
                                            data-ph-capture-attribute-admin-action="approve"
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
