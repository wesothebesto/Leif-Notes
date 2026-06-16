import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { marked } from "marked";

/* ---------------- storage bridge (Electron or browser fallback) ---------------- */
const bridge = window.leif || {
  getNotes: async () => { try { return JSON.parse(localStorage.getItem("leif-notes")); } catch { return null; } },
  setNotes: async (d) => { try { localStorage.setItem("leif-notes", JSON.stringify(d)); } catch {} },
  getConfig: async () => { try { return JSON.parse(localStorage.getItem("leif-config")) || {}; } catch { return {}; } },
  setConfig: async (d) => { try { localStorage.setItem("leif-config", JSON.stringify(d)); } catch {} },
  openDataFolder: async () => alert("Data folder is only available in the desktop app."),
  ask: async () => ({ error: "Ask Leif is only available in the desktop app." }),
};

const seedNote = {
  id: 1,
  title: "Missed NA Coin/Shard Migration",
  tag: "Migration",
  body:
    "Hey there! So sorry to hear that — unfortunately, the NA migration window was open for a full month and has now closed. " +
    "That said, there's a slight chance you may get another opportunity to migrate your coins and shards when we open migration " +
    "for EU/AU regions. We'd recommend keeping a close eye on the announcements channel so you don't miss it if that window opens up!",
  updatedAt: Date.now(),
};

/* ---------------- palette ---------------- */
const C = {
  sidebar: "#0b110e",
  bg: "#0e1713",
  panel: "#121d17",
  panelHi: "#16241c",
  border: "#1d2c24",
  borderSoft: "#172219",
  accent: "#2f8159",
  accentBright: "#48a779",
  glow: "#74d3a3",
  leaf: "#9fe0bd",
  text: "#d8e4dd",
  muted: "#74897d",
  dim: "#506054",
};

export default function App() {
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("notes"); // notes | ask
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // saved | saving
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimer = useRef(null);

  /* load */
  useEffect(() => {
    bridge.getNotes().then((data) => {
      const list = data && data.length ? data : [seedNote];
      setNotes(list);
      setActiveId(list[0]?.id ?? null);
      setLoaded(true);
    });
  }, []);

  /* re-read when window regains focus (e.g. MCP added a note) */
  useEffect(() => {
    const onFocus = () => bridge.getNotes().then((data) => { if (data) setNotes(data); });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* debounced auto-save */
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await bridge.setNotes(notes);
      setSaveState("saved");
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [notes, loaded]);

  const active = notes.find((n) => n.id === activeId) || null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes
      .filter((n) => [n.title, n.tag, n.body].some((f) => (f || "").toLowerCase().includes(q)))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [notes, search]);

  const newNote = () => {
    const n = { id: Date.now(), title: "", tag: "", body: "", updatedAt: Date.now() };
    setNotes((p) => [n, ...p]);
    setActiveId(n.id);
    setView("notes");
    setPreview(false);
  };

  const patch = useCallback((id, fields) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...fields, updatedAt: Date.now() } : n)));
  }, []);

  const remove = (id) => {
    setNotes((p) => {
      const next = p.filter((n) => n.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const copyBody = () => {
    if (!active) return;
    navigator.clipboard.writeText(active.body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!loaded)
    return <div style={{ ...full, background: C.bg, color: C.dim, fontFamily: FONT }}>Loading Leif…</div>;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: FONT, overflow: "hidden" }}>
      {/* ===================== SIDEBAR ===================== */}
      <aside style={{ width: 290, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: 9, WebkitAppRegion: "drag" }}>
          <Leaf />
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>Leif</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowSettings(true)} title="Settings" style={iconBtn}>⚙</button>
        </div>

        {/* nav */}
        <div style={{ display: "flex", gap: 6, padding: "0 14px 12px" }}>
          <NavTab active={view === "notes"} onClick={() => setView("notes")} label="📝 Notes" />
          <NavTab active={view === "ask"} onClick={() => setView("ask")} label="✦ Ask Leif" />
        </div>

        {view === "notes" && (
          <>
            <div style={{ padding: "0 14px 10px" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…"
                style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ padding: "0 14px 10px" }}>
              <button onClick={newNote} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: C.accent, color: "#eafff3", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                + New note
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "2px 10px 14px" }}>
              {filtered.length === 0 ? (
                <div style={{ color: C.dim, fontSize: 13, textAlign: "center", marginTop: 30 }}>No notes found.</div>
              ) : filtered.map((n) => {
                const on = n.id === activeId;
                return (
                  <div key={n.id} onClick={() => { setActiveId(n.id); setView("notes"); setPreview(false); }}
                    style={{ padding: "10px 12px", marginBottom: 4, borderRadius: 8, cursor: "pointer", background: on ? C.panelHi : "transparent", borderLeft: `2px solid ${on ? C.glow : "transparent"}`, transition: "background .12s" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? C.text : "#bccabf", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.title || "Untitled"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      {n.tag && <span style={{ fontSize: 10, fontWeight: 700, color: C.glow, background: "#13301f", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: ".05em" }}>{n.tag}</span>}
                      <span style={{ fontSize: 11.5, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {(n.body || "").replace(/\n/g, " ").slice(0, 40) || "Empty note"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {view === "ask" && (
          <div style={{ flex: 1, padding: "8px 16px", color: C.muted, fontSize: 12.5, lineHeight: 1.6 }}>
            Ask questions about everything in your notes. Leif reads all {notes.length} of your notes to answer.
          </div>
        )}

        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.borderSoft}`, fontSize: 11, color: C.dim, display: "flex", alignItems: "center", gap: 6 }}>
          <Dot saving={saveState === "saving"} />
          {saveState === "saving" ? "Saving…" : "All changes saved"}
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {view === "notes" ? (
          active ? (
            <Editor key={active.id} note={active} preview={preview} setPreview={setPreview}
              patch={patch} remove={remove} copyBody={copyBody} copied={copied} />
          ) : (
            <div style={{ ...full, color: C.dim }}>Select or create a note to begin.</div>
          )
        ) : (
          <AskPanel notes={notes} />
        )}
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

/* ---------------- Editor ---------------- */
function Editor({ note, preview, setPreview, patch, remove, copyBody, copied }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 26px", borderBottom: `1px solid ${C.borderSoft}`, WebkitAppRegion: "drag" }}>
        <input value={note.tag} onChange={(e) => patch(note.id, { tag: e.target.value })} placeholder="tag"
          style={{ width: 110, padding: "5px 9px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.panel, color: C.glow, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", outline: "none", WebkitAppRegion: "no-drag" }} />
        <div style={{ flex: 1 }} />
        <button onClick={() => setPreview(!preview)} style={{ ...ghostBtn, WebkitAppRegion: "no-drag" }}>{preview ? "✎ Edit" : "👁 Preview"}</button>
        <button onClick={copyBody} style={{ ...ghostBtn, WebkitAppRegion: "no-drag", color: copied ? C.glow : C.muted, borderColor: copied ? C.accent : C.border }}>{copied ? "✓ Copied" : "⧉ Copy"}</button>
        <button onClick={() => remove(note.id)} style={{ ...ghostBtn, WebkitAppRegion: "no-drag" }}>🗑</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "26px 40px 60px" }}>
        <input value={note.title} onChange={(e) => patch(note.id, { title: e.target.value })} placeholder="Untitled"
          style={{ width: "100%", border: "none", background: "transparent", color: C.text, fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", outline: "none", marginBottom: 18, boxSizing: "border-box" }} />
        {preview ? (
          <div className="leif-md" style={{ color: C.text, fontSize: 15.5, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: marked.parse(note.body || "*Nothing here yet.*") }} />
        ) : (
          <textarea value={note.body} onChange={(e) => patch(note.id, { body: e.target.value })}
            placeholder="Start writing… markdown supported."
            style={{ width: "100%", minHeight: "60vh", border: "none", background: "transparent", color: "#cdd9d1", fontSize: 15.5, lineHeight: 1.7, outline: "none", resize: "none", fontFamily: FONT, boxSizing: "border-box" }} />
        )}
      </div>
    </>
  );
}

/* ---------------- Ask panel ---------------- */
function AskPanel({ notes }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: "user", content: q }];
    setMsgs(history);
    setInput("");
    setBusy(true);

    const cfg = await bridge.getConfig();
    const ctx = notes.map((n) => `# ${n.title || "Untitled"}${n.tag ? ` [${n.tag}]` : ""}\n${n.body || ""}`).join("\n\n---\n\n");
    const res = await bridge.ask({
      apiKey: cfg.apiKey,
      model: cfg.model,
      notesContext: ctx,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });
    setMsgs((p) => [...p, { role: "assistant", content: res.error ? `⚠ ${res.error}` : res.text }]);
    setBusy(false);
  };

  return (
    <>
      <div style={{ padding: "16px 26px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", alignItems: "center", gap: 10, WebkitAppRegion: "drag" }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>✦ Ask Leif</span>
        <span style={{ fontSize: 12.5, color: C.dim }}>— answers from your notes</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 26px" }}>
        {msgs.length === 0 && (
          <div style={{ color: C.dim, fontSize: 14, textAlign: "center", marginTop: 50, lineHeight: 1.7 }}>
            Ask anything about your notes.<br />
            <span style={{ fontSize: 12.5 }}>e.g. "What do I tell someone who missed migration?"</span>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
            <div className={m.role === "assistant" ? "leif-md" : ""} style={{
              maxWidth: "76%", padding: "11px 15px", borderRadius: 12, fontSize: 14.5, lineHeight: 1.6,
              background: m.role === "user" ? C.accent : C.panel,
              color: m.role === "user" ? "#eafff3" : C.text,
              border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
            }}
              dangerouslySetInnerHTML={m.role === "assistant" ? { __html: marked.parse(m.content || "") } : undefined}>
              {m.role === "user" ? m.content : undefined}
            </div>
          </div>
        ))}
        {busy && <div style={{ color: C.muted, fontSize: 13.5, fontStyle: "italic" }}>Leif is thinking…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "14px 26px 20px", borderTop: `1px solid ${C.borderSoft}`, display: "flex", gap: 10 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about your notes… (Enter to send)" rows={1}
          style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 14.5, outline: "none", resize: "none", fontFamily: FONT, boxSizing: "border-box" }} />
        <button onClick={send} disabled={busy} style={{ padding: "0 20px", borderRadius: 10, border: "none", background: busy ? C.border : C.accent, color: "#eafff3", fontSize: 14.5, fontWeight: 600, cursor: busy ? "default" : "pointer" }}>Send</button>
      </div>
    </>
  );
}

/* ---------------- Settings ---------------- */
function Settings({ onClose }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [folder, setFolder] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { bridge.getConfig().then((c) => { setApiKey(c.apiKey || ""); setModel(c.model || "claude-sonnet-4-6"); }); }, []);

  const save = async () => {
    await bridge.setConfig({ apiKey: apiKey.trim(), model: model.trim() || "claude-sonnet-4-6" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Settings</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>

        <label style={lbl}>Anthropic API key <span style={{ color: C.dim, fontWeight: 400 }}>(for Ask Leif)</span></label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…"
          style={field} />
        <div style={{ fontSize: 11.5, color: C.dim, margin: "6px 0 16px", lineHeight: 1.5 }}>
          Get a key at console.anthropic.com → API Keys. Stored only on your computer in <code>~/.leif/config.json</code>.
        </div>

        <label style={lbl}>Model</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} style={field} />

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={save} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: C.accent, color: "#eafff3", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
          <button onClick={async () => setFolder(await bridge.openDataFolder())} style={{ padding: "10px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13.5, cursor: "pointer" }}>
            Open data folder
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- small bits ---------------- */
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const full = { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 14 };
const iconBtn = { border: "none", background: "transparent", color: C.muted, fontSize: 15, cursor: "pointer", padding: 4, WebkitAppRegion: "no-drag" };
const ghostBtn = { padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 7 };
const field = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" };

function NavTab({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "7px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
      background: active ? C.panelHi : "transparent", color: active ? C.text : C.muted,
    }}>{label}</button>
  );
}

function Dot({ saving }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: saving ? "#caa24a" : C.accentBright, display: "inline-block" }} />;
}

function Leaf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" fill={C.accent} />
      <path d="M5 19c0-8 6-14 14-14" stroke={C.glow} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 19C8 14 12 11 17 9" stroke={C.glow} strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
