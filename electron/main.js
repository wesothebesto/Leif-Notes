const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isDev = !app.isPackaged;

// Shared data folder used by BOTH the app and the MCP server.
const LEIF_DIR = path.join(os.homedir(), ".leif");
const NOTES_PATH = path.join(LEIF_DIR, "notes.json");
const CONFIG_PATH = path.join(LEIF_DIR, "config.json");

function ensureDir() {
  try {
    if (!fs.existsSync(LEIF_DIR)) fs.mkdirSync(LEIF_DIR, { recursive: true });
  } catch (e) {
    console.error("Could not create data folder:", e);
  }
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.error("Read error", file, e);
  }
  return fallback;
}

function writeJson(file, data) {
  try {
    ensureDir();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error("Write error", file, e);
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 740,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: "#0c120f",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "../build/index.html"));
  }
}

// ---- Notes storage ----
ipcMain.handle("notes-get", () => readJson(NOTES_PATH, null));
ipcMain.handle("notes-set", (_, data) => writeJson(NOTES_PATH, data));

// ---- App config (e.g. API key, model) ----
ipcMain.handle("config-get", () => readJson(CONFIG_PATH, {}));
ipcMain.handle("config-set", (_, data) => writeJson(CONFIG_PATH, data));

// ---- Reveal data folder in file explorer ----
ipcMain.handle("open-data-folder", () => {
  ensureDir();
  shell.openPath(LEIF_DIR);
  return LEIF_DIR;
});

// ---- Ask Leif: call the Anthropic API from the main process (no CORS) ----
ipcMain.handle("ask-claude", async (_, { apiKey, model, messages, notesContext }) => {
  if (!apiKey) return { error: "No API key set. Open Settings and paste your Anthropic API key." };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: 1500,
        system:
          "You are Leif, a friendly assistant living inside the user's personal note-taking app. " +
          "You can see the user's notes below and should use them to answer questions, find information, " +
          "draft responses, or summarize. If the notes don't cover something, say so plainly.\n\n" +
          "=== USER'S NOTES ===\n" + (notesContext || "(no notes yet)"),
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) return { error: data.error.message || "API error" };
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return { text };
  } catch (e) {
    return { error: e.message || "Request failed" };
  }
});

app.whenReady().then(() => {
  ensureDir();
  createWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
