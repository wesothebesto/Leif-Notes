# Leif MCP Server

Lets **Claude Desktop** read and write your Leif notes. Once connected, you can say things
like *"add a note in Leif about X"* or *"what does my migration note say?"* and Claude will
use your actual notes.

## Setup (one time)

1. Make sure you have [Node.js](https://nodejs.org) installed.
2. In this `mcp-server` folder, run:
   ```
   npm install
   ```
3. Find your config file:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
4. Add Leif to it (use the **full path** to server.js on your machine):
   ```json
   {
     "mcpServers": {
       "leif": {
         "command": "node",
         "args": ["C:\\full\\path\\to\\leif\\mcp-server\\server.js"]
       }
     }
   }
   ```
5. Restart Claude Desktop. You'll see Leif's tools available.

Both Leif and this server share the same notes file at `~/.leif/notes.json`, so changes
made in Claude show up in the app (it refreshes when you click back into it) and vice-versa.
