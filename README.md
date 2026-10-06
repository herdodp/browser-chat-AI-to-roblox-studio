# Snapgent - Browser Chat AI to Roblox Studio

> Turn any web-based AI chat into an agent that builds in Roblox Studio for you.

Snapgent is a **browser extension + local bridge** that gives a normal AI chat (DeepSeek, ChatGPT, or GLM) real hands inside your open Roblox Studio place. You describe what you want in plain language, the AI writes Snapgent commands into its reply, the extension executes them against Roblox Studio through the official **MCP (Model Context Protocol)** server, and the result is fed straight back to the AI. No API key. No terminal. No copy-pasting code.

---

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Supported AI providers](#supported-ai-providers)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Commands the AI can run](#commands-the-ai-can-run)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What it does

Snapgent gives a web-based AI chat real hands inside Roblox Studio. With it, the AI can:

- **Read and edit scripts** in your place (create, modify, move, delete).
- **Run Luau code** live in Edit mode or during Play (Server/Client).
- **Inspect the game tree** - instances, properties, attributes, children.
- **Build objects and models** - including meshes and procedural shapes.

Everything happens through the connected Studio MCP server. You never leave the chat window, and you never touch a terminal.

---

## How it works

Snapgent has three parts that talk to each other over a local WebSocket:

```
┌─────────────┐   plain-text   ┌──────────────────┐   WebSocket   ┌────────────┐   MCP   ┌────────────────┐
│  AI chat    │ ── commands ─▶ │  Snapgent        │ ────────────▶ │  Bridge    │ ──────▶ │  Roblox Studio │
│  (browser)  │ ◀── results ── │  extension       │ ◀──────────── │  (local)   │ ◀────── │  + MCP server  │
└─────────────┘                └──────────────────┘               └────────────┘         └────────────────┘
```

1. **You** type a request into the AI chat.
2. The **AI** replies with a Snapgent command - a plain-text JSON object in a fenced code block (or a `###LUA###` block for Luau).
3. The **extension** watches the reply, detects the command, and forwards it to the local bridge.
4. The **bridge** runs the command against the connected Roblox Studio MCP server.
5. The **result** (success or a formatted error) is sent back into the chat as the next message, and the AI keeps going on its own.

Because commands are just text in the AI's reply, they work on any chat site Snapgent supports - no vendor plugins required.

---

## Supported AI providers

| Provider | URL | Status | Notes |
|---|---|---|---|
| **DeepSeek** | `chat.deepseek.com` | Recommended | Most stable, best tool adherence |
| **ChatGPT** | `chatgpt.com` | Supported | ProseMirror composer, CodeMirror reply reading |
| **Z.ai (GLM)** | `chat.z.ai` | Supported | Svelte DOM, code-block wrapper masking |

---

## Requirements

- **Google Chrome** or **Microsoft Edge** (Manifest V3).
- **Roblox Studio** installed, with the Studio MCP server enabled (Assistant settings > MCP Servers).
- **Windows** for the prebuilt bridge (`bridge.exe` / `start-roblox.bat`). Python 3.9+ is only needed if you run `bridge.py` directly.

---

## Installation

### 1. Load the extension

1. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `snapgent-extension` folder.
5. The Snapgent icon appears in your toolbar - the extension is active.

### 2. Set up the bridge

1. Open **Roblox Studio** and open the place you want the AI to work in.
2. Enable the Studio MCP server (Assistant settings > MCP Servers).
3. Double-click **`start-roblox.bat`**. A small window opens and stays open while the bridge is running.

### 3. Start a session

1. Go to a supported chat site (e.g. `https://chat.deepseek.com`).
2. Open a new chat - Snapgent only activates on the exact supported addresses.
3. Click **Start session** in the Snapgent panel.
4. Describe what you want to build. The AI takes it from there.

---

## Usage

Once a session is running, just talk to the AI normally:

> "Create a part at the origin, make it a red neon sphere, and add a spinning script."

> "Read the script in ServerScriptService.Main and add a cooldown to the attack function."

> "Build a small house model with walls, a roof and a door."

The AI emits commands, Snapgent executes them against Studio, and you watch the results appear in the chat. You can step in at any time with a new instruction.

**Tips**

- Keep the bridge window open while you work - closing it stops the connection.
- Keep Roblox Studio open with the place loaded, and its MCP server enabled.

---

## Commands the AI can run

Snapgent exposes every command from the connected Studio MCP server. The AI calls `list_commands` first to discover them; the typical set includes:

- **Script / instance editing** - `multi_edit`, `script_read`, `inspect_instance`, `search_game_tree`.
- **Code execution** - `execute_luau` (runs Luau live; supports `###LUA:Server###` / `###LUA:Client###` during Play).
- **Object generation** - `generate_mesh`, `generate_procedural_model`.
- **State inspection** - `get_studio_state`, `get_datamodel_tree`, and more.

---

## Project structure

```
snapgent-roblox/
├── snapgent-extension/        # The browser extension (load this folder unpacked)
│   ├── core/                  # Provider-agnostic logic
│   │   ├── config.js          # System prompt, feedback strings, tool categories
│   │   ├── parser.js          # Command parser
│   │   └── main.js            # Agentic loop + UI
│   ├── providers/             # Per-AI-site adapters (deepseek, chatgpt, glm)
│   ├── background.js          # WebSocket service worker
│   ├── manifest.json          # MV3 manifest
│   ├── overlay.css
│   └── popup.html / popup.js
├── config.json                # MCP server config (bridge) - server "roblox"
├── start-roblox.bat           # Windows bridge launcher
├── bridge.py / bridge.exe     # Local bridge (WebSocket <-> Studio MCP)
├── launch_studio_mcp.py/.exe  # Robust Studio MCP launcher
├── bridge/                    # Bundled bridge runtime
└── launch_studio_mcp/         # Bundled launcher runtime
```

---

## Architecture

The extension is split into a **provider-agnostic core** and **per-site providers**. The core never touches a host site's DOM directly - it only talks to the `ZSProvider` interface.

```
core/config.js        system prompt, feedback strings, tool categories   (global ZS)
core/parser.js        Snapgent command parsing - pure string logic      (global ZSParse)
core/main.js          agentic loop, UI, camouflage, session state        (uses ZSProvider)
providers/deepseek.js DeepSeek-specific: DOM selectors, generation
                      detection, send mechanics, composer modes         (global ZSProvider)
providers/chatgpt.js  ChatGPT: React DOM, ProseMirror composer,
                      CodeMirror reply reading                          (global ZSProvider)
providers/chatgpt-cm.js MAIN-world CodeMirror tap for ChatGPT
providers/glm.js      Z.ai / GLM: Svelte DOM, code-block wrapper masking (global ZSProvider)
background.js         WebSocket to the local bridge (provider-agnostic)
```

The **bridge** (`bridge.py` / `bridge.exe`) is a local WebSocket server that spawns and routes to the MCP servers declared in `config.json`. Each MCP server is a stdio child process; the bridge matches responses by JSON-RPC id, drains stderr, auto-restarts dead servers, and locks calls per server.

### Adding a new provider

No core changes required:

1. Write `providers/<site>.js` exporting the same `ZSProvider` interface.
2. Add the site's URL pattern to `manifest.json` (`content_scripts` + `host_permissions`).
3. Add it to `PROVIDER_URLS` in `background.js`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Bridge offline" error | Bridge not running, or Studio closed | Start `start-roblox.bat`; ensure Roblox Studio is open |
| "Roblox Studio is not connected" | Studio MCP server disabled | Enable it: Assistant settings > MCP Servers |
| "Extension was reloaded" | Tab running a stale extension version | Reload the page (F5) |
| Commands never run | Wrong site or address | Use an exact supported URL, open a new chat |

---

## License

Released under the MIT License. See [LICENSE](LICENSE).
