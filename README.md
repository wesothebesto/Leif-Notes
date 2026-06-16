# 🍃 Leif

A simple, calm note-taking app with a forest-green Obsidian-style design — and Claude built in.

- **Auto-save** — every keystroke is saved to `~/.leif/notes.json`. You can't lose your work.
- **Markdown notes** with live preview, tags, search, copy, and delete.
- **Ask Leif** — a built-in panel that answers questions using your own notes (needs an Anthropic API key).
- **MCP server** — connect Leif to Claude Desktop so Claude can read & write your notes.

---

## Get the app (no coding needed)

This repo builds a Windows installer for you automatically via GitHub Actions:

1. Push this project to a GitHub repository.
2. Open the **Actions** tab → wait for the green checkmark (~5 min).
3. Open the finished run → under **Artifacts**, download **Leif-Windows-Installer**.
4. Unzip it and run the `.exe`. Install like any normal app.

To trigger a fresh build anytime, go to **Actions → Build Leif → Run workflow**.

---

## Run it yourself (optional, for development)

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev        # opens the app in development mode
npm run dist       # builds an installer into the release/ folder
```

---

## Ask Leif (in-app AI)

Click **✦ Ask Leif** in the sidebar. The first time, open **Settings (⚙)** and paste an
Anthropic API key from console.anthropic.com. Your key is stored only on your computer.

## Connect to Claude Desktop (MCP)

See [`mcp-server/README.md`](mcp-server/README.md) for the few steps to link your notes
to Claude Desktop.

## Where is my data?

Everything lives in a plain JSON file at `~/.leif/notes.json`. Open **Settings → Open data
folder** to find it. Back it up anytime by copying that file.
