<div align="center">

<h1>🎮 browser-chat-AI-to-roblox-studio</h1>

<p><b>Turn any browser AI chat into an agent that builds, scripts and inspects your Roblox Studio place.</b></p>

<p>
<img src="https://img.shields.io/badge/extension-chrome%20%2F%20edge-FACC15?style=plastic&labelColor=000000" alt="extension">
<img src="https://img.shields.io/badge/bridge-windows-FACC15?style=plastic&labelColor=000000" alt="bridge">
<img src="https://img.shields.io/badge/protocol-mcp-FACC15?style=plastic&labelColor=000000" alt="mcp">
<img src="https://img.shields.io/badge/runtime-luau-00A2FF?style=plastic&labelColor=000000" alt="luau">
<img src="https://img.shields.io/badge/license-MIT-22c55e?style=plastic&labelColor=000000" alt="license">
</p>

</div>

<br>

> Snapgent is a **browser extension + local bridge** that gives a normal AI chat (DeepSeek, ChatGPT, GLM) real hands inside your open Roblox Studio place. You describe what you want in plain language, the AI writes Snapgent commands into its reply, the extension executes them against Studio through the official **MCP (Model Context Protocol)** server, and the result is fed straight back to the AI.
>
> **No API key. No terminal. No copy-pasting code.**

<br>

---

## 🧱 Feature deck

<table>
<tr>
<td width="50%" valign="top">

#### 📜 Scripts
Create, read, edit, move and delete scripts in your place — directly from chat.

#### 🧩 Build
Generate parts, models, meshes and procedural shapes with a prompt.

</td>
<td width="50%" valign="top">

#### ⚙️ Run Luau
Execute Luau live in Edit mode or during Play (Server / Client).

#### 🔎 Inspect
Read the game tree — instances, properties, attributes, children.

</td>
</tr>
</table>

---

## 🔄 The loop

<table>
<tr>
<td align="center"><b>1. You ask</b></td>
<td align="center">➜</td>
<td align="center"><b>2. AI writes a command</b></td>
<td align="center">➜</td>
<td align="center"><b>3. Extension runs it</b></td>
<td align="center">➜</td>
<td align="center"><b>4. Bridge → Studio</b></td>
<td align="center">➜</td>
<td align="center"><b>5. Result back to AI</b></td>
</tr>
</table>

```
┌─────────────┐   plain-text   ┌──────────────┐   WebSocket   ┌────────────┐   MCP   ┌────────────────┐
│  AI chat    │ ── commands ─▶ │  Snapgent    │ ────────────▶ │  Bridge    │ ──────▶ │  Roblox Studio │
│  (browser)  │ ◀── results ── │  extension   │ ◀──────────── │  (local)   │ ◀────── │  + MCP server  │
└─────────────┘                └──────────────┘               └────────────┘         └────────────────┘
```

Commands are just **plain text** in the AI's reply — so they work on any chat site Snapgent supports, with no vendor plugins.

---

## 🤖 Supported AI providers

<table>
<tr><th>Provider</th><th>URL</th><th>Status</th><th>Notes</th></tr>
<tr><td><b>DeepSeek</b></td><td><code>chat.deepseek.com</code></td><td>🟢 Recommended</td><td>Most stable, best tool adherence</td></tr>
<tr><td><b>ChatGPT</b></td><td><code>chatgpt.com</code></td><td>🟡 Supported</td><td>ProseMirror composer, CodeMirror reply reading</td></tr>
<tr><td><b>Z.ai (GLM)</b></td><td><code>chat.z.ai</code></td><td>🟡 Supported</td><td>Svelte DOM, code-block wrapper masking</td></tr>
</table>

---

## 📋 Requirements

| | |
|---|---|
| 🌐 **Browser** | Google Chrome or Microsoft Edge (Manifest V3) |
| 🎮 **Studio** | Roblox Studio installed, with the Studio MCP server enabled |
| 💻 **Bridge** | Windows for the prebuilt bridge (`bridge.exe` / `start-roblox.bat`) |

---

## 🚀 Install

<table>
<tr><th align="left">Step 1 — Load the extension</th></tr>
<tr><td>

1. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `snapgent-extension` folder.
4. The Snapgent icon appears in your toolbar.

</td></tr>
<tr><th align="left">Step 2 — Start the bridge</th></tr>
<tr><td>

1. Open **Roblox Studio** with the place you want to work in.
2. Enable its MCP server: **Assistant settings → MCP Servers**.
3. Double-click **`start-roblox.bat`**. A small window opens and stays open.

</td></tr>
<tr><th align="left">Step 3 — Start a session</th></tr>
<tr><td>

1. Go to a supported chat site (e.g. `https://chat.deepseek.com`) and open a new chat.
2. Click **Start session** in the Snapgent panel.
3. Describe what you want to build. The AI takes it from there.

</td></tr>
</table>

---

## 🎯 Usage examples

```text
"Create a part at the origin, make it a red neon sphere, and add a spinning script."

"Read the script in ServerScriptService.Main and add a cooldown to the attack function."

"Build a small house model with walls, a roof and a door."
```

The AI emits commands, Snapgent executes them against Studio, and you watch the results appear in the chat. Step in any time with a new instruction.

---

## 🧠 Commands the AI can run

Snapgent exposes every command from the connected Studio MCP server. The AI calls `list_commands` first to discover them. The typical set:

| Category | Commands |
|---|---|
| 📜 **Scripts / instances** | `multi_edit`, `script_read`, `inspect_instance`, `search_game_tree` |
| ⚙️ **Code execution** | `execute_luau` (live; supports `###LUA:Server###` / `###LUA:Client###` during Play) |
| 🧩 **Object generation** | `generate_mesh`, `generate_procedural_model` |
| 🔎 **State inspection** | `get_studio_state`, `get_datamodel_tree`, and more |

---

## 📂 Project structure

```
snapgent-roblox/
├── snapgent-extension/        # The browser extension (load this folder unpacked)
│   ├── core/                  # Provider-agnostic logic (config, parser, main)
│   ├── providers/             # Per-AI-site adapters (deepseek, chatgpt, glm)
│   ├── background.js          # WebSocket service worker
│   └── manifest.json          # MV3 manifest
├── config.json                # MCP server config (bridge) — server "roblox"
├── start-roblox.bat           # Windows bridge launcher
├── bridge.py / bridge.exe     # Local bridge (WebSocket <-> Studio MCP)
├── launch_studio_mcp.py/.exe  # Robust Studio MCP launcher
├── bridge/                    # Bundled bridge runtime
└── launch_studio_mcp/         # Bundled launcher runtime
```

---

## 🛠️ Architecture

The extension is split into a **provider-agnostic core** and **per-site providers**. The core never touches a host site's DOM directly — it only talks to the `ZSProvider` interface.

```
core/config.js        system prompt, feedback strings, tool categories   (global ZS)
core/parser.js        Snapgent command parsing — pure string logic      (global ZSParse)
core/main.js          agentic loop, UI, camouflage, session state        (uses ZSProvider)
providers/deepseek.js DeepSeek-specific: DOM selectors, send mechanics  (global ZSProvider)
providers/chatgpt.js  ChatGPT: React DOM, ProseMirror composer          (global ZSProvider)
providers/chatgpt-cm.js MAIN-world CodeMirror tap for ChatGPT
providers/glm.js      Z.ai / GLM: Svelte DOM, code-block masking        (global ZSProvider)
background.js         WebSocket to the local bridge (provider-agnostic)
```

The **bridge** is a local WebSocket server that spawns and routes to the MCP servers declared in `config.json`. Each MCP server is a stdio child; the bridge matches responses by JSON-RPC id, drains stderr, auto-restarts dead servers and locks calls per server.

**Adding a new provider** — no core changes required:

1. Write `providers/<site>.js` exporting the same `ZSProvider` interface.
2. Add the site's URL pattern to `manifest.json`.
3. Add it to `PROVIDER_URLS` in `background.js`.

---

## 🩺 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Bridge offline" | Bridge not running, or Studio closed | Start `start-roblox.bat`; ensure Roblox Studio is open |
| "Roblox Studio is not connected" | Studio MCP server disabled | Enable it: Assistant settings → MCP Servers |
| "Extension was reloaded" | Tab running a stale extension version | Reload the page (F5) |
| Commands never run | Wrong site or address | Use an exact supported URL, open a new chat |

---

<div align="center">

### 📄 MIT License

Built for builders. Enjoy, and ship something great. 🎮

<sub>Snapgent — Roblox Studio edition</sub>

</div>
