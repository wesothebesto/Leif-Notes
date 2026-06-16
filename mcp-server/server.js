#!/usr/bin/env node
/**
 * Leif MCP Server
 * Exposes your Leif notes (stored in ~/.leif/notes.json) to Claude Desktop.
 * Tools: list_notes, search_notes, read_note, create_note, update_note
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import os from "os";

const NOTES_PATH = path.join(os.homedir(), ".leif", "notes.json");

function readNotes() {
  try {
    if (fs.existsSync(NOTES_PATH)) return JSON.parse(fs.readFileSync(NOTES_PATH, "utf-8"));
  } catch {}
  return [];
}
function writeNotes(notes) {
  fs.mkdirSync(path.dirname(NOTES_PATH), { recursive: true });
  fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2));
}

const server = new Server(
  { name: "leif", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_notes",
      description: "List all of the user's Leif notes (id, title, tag).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "search_notes",
      description: "Search the user's Leif notes by keyword in title, tag, or body.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Keyword to search for" } },
        required: ["query"],
      },
    },
    {
      name: "read_note",
      description: "Read the full content of one note by its id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number", description: "The note id" } },
        required: ["id"],
      },
    },
    {
      name: "create_note",
      description: "Create a new note in Leif.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          tag: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
      },
    },
    {
      name: "update_note",
      description: "Update an existing note's title, tag, or body by id.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number" },
          title: { type: "string" },
          tag: { type: "string" },
          body: { type: "string" },
        },
        required: ["id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const notes = readNotes();
  const ok = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

  if (name === "list_notes") {
    return ok(notes.map((n) => ({ id: n.id, title: n.title || "Untitled", tag: n.tag || "" })));
  }

  if (name === "search_notes") {
    const q = String(args.query || "").toLowerCase();
    const hits = notes
      .filter((n) => [n.title, n.tag, n.body].some((f) => (f || "").toLowerCase().includes(q)))
      .map((n) => ({ id: n.id, title: n.title, tag: n.tag, preview: (n.body || "").slice(0, 160) }));
    return ok(hits);
  }

  if (name === "read_note") {
    const n = notes.find((x) => x.id === args.id);
    return n ? ok(n) : ok({ error: "Note not found" });
  }

  if (name === "create_note") {
    const n = {
      id: Date.now(),
      title: args.title || "",
      tag: args.tag || "",
      body: args.body || "",
      updatedAt: Date.now(),
    };
    notes.unshift(n);
    writeNotes(notes);
    return ok({ created: n });
  }

  if (name === "update_note") {
    const i = notes.findIndex((x) => x.id === args.id);
    if (i === -1) return ok({ error: "Note not found" });
    notes[i] = {
      ...notes[i],
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.tag !== undefined ? { tag: args.tag } : {}),
      ...(args.body !== undefined ? { body: args.body } : {}),
      updatedAt: Date.now(),
    };
    writeNotes(notes);
    return ok({ updated: notes[i] });
  }

  return ok({ error: `Unknown tool: ${name}` });
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Leif MCP server running.");
