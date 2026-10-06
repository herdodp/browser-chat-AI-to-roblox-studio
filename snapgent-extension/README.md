# Snapgent - AI Roblox Studio Agent (DeepSeek, ChatGPT, GLM)

Control Roblox Studio with AI. Snapgent turns a normal AI chat (DeepSeek, ChatGPT, or GLM) into an agent that works directly in your open Studio place for you: just describe what you want, and it reads, edits, runs Luau, and builds in your place through the Studio MCP server. No API key, no terminal, no copy-pasting code.

It's a Chrome/Edge browser extension plus a small local bridge that connects the chat to Roblox Studio through the official MCP server. **DeepSeek is the recommended provider.**

## Setup

**Load the extension manually (Edge or Chrome):**
1. Go to `edge://extensions` (Edge) or `chrome://extensions` (Chrome)
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `snapgent-extension` folder
5. The extension is now active

**Then set up the Bridge:**
1. **Download the Bridge** from wherever you received this package.
2. **Open Roblox Studio** and open the place you want the AI to work in, and enable the Studio MCP server (Assistant settings > MCP Servers).
3. **Run the Bridge** - double-click `start-roblox.bat`. A small window opens and the Bridge is running.
4. **Go to** https://chat.deepseek.com (recommended), https://chatgpt.com, or https://chat.z.ai, and open a new chat (only works on these exact addresses).
5. Click **Start session** in the Snapgent panel.
6. Type what you want to build.

## Architecture (for contributors)

The extension is split between a provider-agnostic core and per-AI-site providers:

```
core/config.js        system prompt, feedback strings, tool categories (global ZS)
core/parser.js        Snapgent command parsing - pure string logic   (global ZSParse)
core/main.js          agentic loop, UI, camouflage, session state      (uses ZSProvider)
providers/deepseek.js everything DeepSeek-specific: DOM selectors, generation
                      detection, send mechanics, composer modes       (global ZSProvider)
providers/glm.js      same interface for GLM / Z.ai (Svelte DOM, code-block
                      wrapper masking)                                 (global ZSProvider)
providers/chatgpt.js  same interface for ChatGPT / chatgpt.com
providers/chatgpt-cm.js MAIN-world CodeMirror tap
background.js         WebSocket to the local bridge (provider-agnostic)
```

`core/main.js` never touches the host site's DOM directly - it only calls the
`ZSProvider` interface. To integrate another AI site: write a new
`providers/<site>.js` exporting the same interface, then add its URL pattern to
`manifest.json` (`content_scripts` + `host_permissions`) and to
`PROVIDER_URLS` in `background.js`. No core change required.
