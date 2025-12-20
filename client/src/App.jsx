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
    Grid,
    Link,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";

import {projects} from "./projects";
import {fetchNotes, submitNote} from "./api";
import {NewThemeButton, ThemeSelector} from "@rajrai/mui-theme-manager";

function formatRelative(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day >= 7) return d.toLocaleDateString();
    if (day >= 2) return `${day} days ago`;
    if (day === 1) return "Yesterday";
    if (hr >= 2) return `${hr} hours ago`;
    if (hr === 1) return "1 hour ago";
    if (min >= 2) return `${min} minutes ago`;
    if (min === 1) return "1 minute ago";
    return "Just now";
}

export default function App() {
    const [query, setQuery] = useState("");

    const [notes, setNotes] = useState([]);
    const [notesBusy, setNotesBusy] = useState(false);
    const [notesError, setNotesError] = useState("");

    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitState, setSubmitState] = useState("");
    const [submitError, setSubmitError] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((p) =>
            `${p.title} ${p.tagline} ${(p.tags || []).join(" ")}`.toLowerCase().includes(q)
        );
    }, [query]);

    useEffect(() => {
        setNotesBusy(true);
        fetchNotes()
            .then((data) => setNotes(data.notes || []))
            .catch((e) => setNotesError(e?.message || "Failed to load notes"))
            .finally(() => setNotesBusy(false));
    }, []);

    async function onSubmit(e) {
        e.preventDefault();
        setSubmitError("");
        setSubmitState("");

        if (message.trim().length < 2) {
            setSubmitError("Write a real note 🙂");
            return;
        }

        setSubmitBusy(true);
        try {
            await submitNote({name: name.trim(), message: message.trim()});
            setSubmitState("Thanks — your note will appear once approved.");
            setName("");
            setMessage("");
        } catch (err) {
            setSubmitError(err?.message || "Failed to submit");
        } finally {
            setSubmitBusy(false);
        }
    }

    return (
        <Box sx={{minHeight: "100vh", display: "flex", flexDirection: "column"}}>
            {/* Header */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backgroundColor: "background.paper",
                    borderBottom: 1,
                    borderColor: "divider",
                }}
            >
                <Toolbar>
                    <Container maxWidth="lg" sx={{display: "flex", alignItems: "center", gap: 2}}>
                        <TextField
                            size="small"
                            placeholder="Search projects…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            sx={{width: 300}}
                        />

                        <Box sx={{flex: 1}}>
                        </Box>

                        <Stack direction="row" spacing={1}>
                            <ThemeSelector id="topbar"/>
                            <NewThemeButton/>
                        </Stack>
                    </Container>
                </Toolbar>
            </AppBar>

            {/* Content */}
            <Container maxWidth="lg" sx={{py: 3, flex: 1}}>
                {/* Projects */}
                <Typography variant="overline" color="text.secondary">Projects</Typography>

                <Box sx={{mt: 1}}>
                    <Box
                        sx={{
                            mt: 1,
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                md: "repeat(3, minmax(0, 1fr))",
                            },
                            gap: 2,
                            gridAutoFlow: "dense",
                        }}
                    >
                        {filtered.map((p) => (
                            <Card
                                key={p.id}
                                variant="outlined"
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <CardContent sx={{flex: 1}}>
                                    <Typography variant="h6" fontWeight={750}>
                                        {p.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{mt: 0.75}}>
                                        {p.tagline}
                                    </Typography>

                                    {!!(p.tags || []).length && (
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mt: 2}}>
                                            {p.tags.map((t) => (
                                                <Box
                                                    key={t}
                                                    component="span"
                                                    sx={{
                                                        px: 1,
                                                        py: 0.5,
                                                        border: 1,
                                                        borderColor: "divider",
                                                        borderRadius: 999,
                                                        typography: "caption",
                                                        color: "text.secondary",
                                                    }}
                                                >
                                                    {t}
                                                </Box>
                                            ))}
                                        </Stack>
                                    )}
                                </CardContent>

                                {!!(p.links || []).length && (
                                    <CardActions sx={{px: 2, pb: 2}}>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            {p.links.map((l) => (
                                                <Button
                                                    key={l.href + l.label}
                                                    size="small"
                                                    variant="contained"
                                                    component="a"
                                                    href={l.href}
                                                    target="_blank"
                                                >
                                                    {l.label}
                                                </Button>
                                            ))}
                                        </Stack>
                                    </CardActions>
                                )}
                            </Card>
                        ))}
                    </Box>
                </Box>

                <Divider sx={{my: 4}}/>

                {/* Leave a note – FULL WIDTH */}
                <Typography variant="overline" color="text.secondary">Leave a note</Typography>

                <Card variant="outlined" sx={{mt: 1, mb: 3}}>
                    <CardContent>
                        <Stack spacing={2} component="form" onSubmit={onSubmit}>
                            <TextField
                                label="Name (optional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                size="small"
                            />

                            <TextField
                                label="Note"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                multiline
                                minRows={6}
                            />

                            {submitError && <Alert severity="error">{submitError}</Alert>}
                            {submitState && <Alert severity="success">{submitState}</Alert>}

                            <Box sx={{display: "flex", justifyContent: "flex-end"}}>
                                <Button type="submit" variant="contained" disabled={submitBusy}>
                                    {submitBusy ? "Submitting…" : "Submit"}
                                </Button>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Recent notes – FULL WIDTH BELOW */}
                <Typography variant="overline" color="text.secondary">Recent notes</Typography>

                <Stack spacing={2} sx={{mt: 1}}>
                    {notesBusy && (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18}/>
                            <Typography variant="body2">Loading…</Typography>
                        </Stack>
                    )}

                    {notesError && <Alert severity="error">{notesError}</Alert>}

                    {!notesBusy && notes.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No notes yet.</Typography>
                    )}

                    {notes.map((n) => (
                        <Card key={n.id} variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    {n.name || "Anonymous"} •{" "}
                                    <Typography component="span" variant="caption" color="text.secondary">
                                        {formatRelative(n.created_at)}
                                    </Typography>
                                </Typography>
                                <Typography variant="body2" sx={{mt: 1, whiteSpace: "pre-wrap"}}>
                                    {n.message}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Container>

            {/* Footer */}
            <Box component="footer" sx={{borderTop: 1, borderColor: "divider", py: 2}}>
                <Container maxWidth="lg">
                    <Typography variant="body2" color="text.secondary">
                        Built with{" "}
                        <Link href="https://mui.com/" target="_blank">Material UI</Link>,{" "}
                        <Link href="https://react.dev/" target="_blank">React</Link>,{" "}
                        <Link href="https://vitejs.dev/" target="_blank">Vite</Link>, and{" "}
                        <Link href="https://expressjs.com/" target="_blank">Express</Link>.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
