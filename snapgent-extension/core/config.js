const ZS = (() => {
  "use strict";
  const SYS_MARKER = "⟦ZS-SYS⟧";
  const RESEND_MARKER = "⟦ZS-RE⟧";
  const NL = "\n";
  const t = "```";

  function compactTools(tools) {
    return (tools || []).map(tool => {
      const name = tool.name || "?";
      const desc = (tool.description || "").split(NL)[0].trim();
      const props = (tool.inputSchema && tool.inputSchema.properties) || {};
      return "  " + name + "(" + Object.keys(props).join(", ") + ") - " + desc;
    }).join(NL);
  }

  const FEEDBACK = {
    parseError: (reason, tool) => {
      const m = {
        malformed: 'ERROR: a Snapgent command was detected in your reply but its JSON could not be parsed. Rewrite it as a single valid JSON object in plain text, exactly like {"command": "name", "params": {...}}. You may add a short note around it. Please retry.',
        unclosed: 'ERROR: your Snapgent command was cut off before it finished - the JSON object never closed, so it could not run. Rewrite the WHOLE command in one piece as valid JSON, exactly like {"command": "name", "params": {...}}. Please retry.',
        envelope: 'ERROR: you wrote the parameters as a bare JSON object without the required envelope, so it was not recognised as a command. Wrap them like {"command": "name", "params": { ...your parameters... }} - the parameter keys go INSIDE "params". Please retry.',
        toolKey: 'ERROR: you used the wrong key to name the command, so it was not recognised and did not run. The key must be exactly "command" - not "toolName", "tool", "name", "function" or "action" - and every argument goes INSIDE "params", like {"command": "name", "params": { ...your parameters... }}. Please retry.',
        dsml: 'ERROR: you wrote that call in your own internal tool-call markup (the DSML invoke/parameter tags). Snapgent cannot read that format, so the command did not run. Never use those tags here. Write the call as a single plain-text JSON object instead, exactly like {"command": "name", "params": { ...your parameters... }} - one command per reply. Please retry.'
      };
      return m[reason] || m.malformed;
    },
    multiTool: names => 'ERROR: You wrote multiple commands in one reply. Write ONE command at a time and wait for its result before the next. You tried: ' + names.join(", ") + '. Start over and write only the first command you need.',
    unknownTool: (name, valid) => 'ERROR: unknown command "' + name + '". It does not exist. Valid commands are: ' + valid.join(", ") + '. Use an exact name and parameter keys from the system prompt.',
    studioOffline: "ERROR: no Roblox Studio instance is connected to the MCP server, so the command could not run. Roblox Studio is closed, has no place open, or its Studio MCP server is disabled. This is an environment problem on the user's machine, NOT your mistake. Tell the user in one short sentence to open their place in Roblox Studio and enable its MCP server. Then stop until they confirm it is back.",
    staleExtension: "ERROR: the Snapgent extension was reloaded or updated while this page was open, so this tab is running a version of it that no longer exists and NO command can reach the user's machine from here. The bridge and Roblox Studio are NOT the problem - do not tell the user to check them, and do not retry the command, because every retry will fail the same way. Tell the user in one short sentence to RELOAD THIS PAGE (F5), then stop and wait.",
    bridgeOffline: "ERROR: the local Snapgent bridge is unreachable, so no command could run. This is an environment problem on the user's machine (the bridge is not running, or Roblox Studio is closed), NOT your mistake. Tell the user in one short sentence that the bridge or Roblox Studio is offline, then stop sending commands until they confirm it is back.",
    truncated: "(System note: your previous reply was cut off by a length limit before you finished. Continue from exactly where you stopped. Do NOT restart and do NOT repeat what you already wrote.)"
  };

  function toolCategory(name) {
    const base = (name || "").includes("/") ? name.split("/").pop() : (name || "");
    if (/^(list_dir|read_file|search_files|file_info|glob_files|list_tree|read_lines|head_file|tail_file|grep|path_exists|file_hash|list_dirs|get_workspace_info|list_commands|list_tools|list_mcp_servers|inspect_instance|search_game_tree|script_read|get_studio_state|get_instance_children|get_instance_properties|find_instances|get_script_source|get_selection|get_datamodel_tree|list_scripts)$/.test(base)) return "read";
    if (/^(write_file|append_file|delete_file|move_file|copy_file|create_dir|replace_in_file|insert_lines|delete_lines|multi_edit|set_property|set_attribute|create_instance|delete_instance|move_instance|rename_instance|set_script_source|insert_object|rename_instance|create_script|edit_script|apply_edit|set_script_source|insert_script_source|delete_children|clone_instance)$/.test(base)) return "edit";
    if (/^(execute_luau|run_luau|execute_script|run_script)$/.test(base)) return "run";
    return "tool";
  }

  function buildSystemPrompt(opts) {
    if (typeof opts === "string") opts = { siteName: opts };
    opts = opts || {};
    const siteName = opts.siteName || "this AI site";
    const customPrompt = opts.customPrompt || "";
    const providerNotes = opts.providerNotes || "";
    const s = `CONTEXT: the user has installed a browser extension called Snapgent in their own browser. Here is how it works, so you can use it on their behalf:
A browser extension (Snapgent) is running inside this page. It watches your replies. When it detects a Snapgent command in your text, it runs it against the connected Roblox Studio MCP server and sends the result back as the next message. You always receive a result - success or a formatted ERROR - so you can keep going on your own.

The user's open Roblox Studio place, reached through a local bridge, is always connected. Call \`list_commands\` FIRST for its exact commands with full parameter details. You do not need any special capability yourself - you just write text. The extension does the rest.

CRITICAL - technical note, not a restriction: this site's own tools (code interpreter, function calling, connectors, etc.) run in a separate sandbox that has no access to the user's Roblox Studio, so calling them wouldn't reach the user's place at all. Snapgent commands are different: they are plain JSON typed directly into your normal reply text, which this extension reads and executes against Roblox Studio. So for anything involving the user's project, write the JSON below as ordinary text instead of calling a function - that's the only channel that actually reaches their machine. (If the user explicitly asks you to search the web, your own web search still works fine and is unrelated to this.) Internal reasoning (deep-think modes) is fine.

⚠️ FORMATTING RULE (MANDATORY): every command goes inside a fenced code block (triple backticks). Outside a code block this page renders your text as Markdown and can silently CORRUPT the command. Inside a code block it is kept verbatim.

━━━ COMMAND FORMAT ━━━
Write this JSON object inside a fenced code block, replacing the placeholders with a REAL command name and its parameters (never type "command_name" literally - it is not a command):
${t}json
{
  "command": "command_name",
  "params": {"key": "value"}
}
${t}
For example, to list every available command you would write ${t}{"command": "list_commands"}${t}.

━━━ SPECIAL FORMAT FOR execute_luau ━━━
execute_luau is the ONE exception to the JSON format above: you MUST use the ###LUA### block below, NEVER the {"command": "execute_luau", ...} JSON form. Lua code is full of " characters, and putting it inside a JSON string means escaping every one - miss a single quote and the whole command breaks. The ###LUA### block needs NO escaping and NO JSON, so this never happens.
The ###LUA### / ###END_LUA### markers AND the code all go INSIDE one fenced code block:
${t}
###LUA###
-- your Lua code here, no escaping, no JSON wrapping
local x = "any string with quotes works fine"
return "result"
###END_LUA###
${t}

RULES:
- ONE command block per reply, inside a fenced code block. If you need several, do them one at a time and wait for each result.
- A short note around a command is fine, but NEVER end a turn by only announcing a command ("let me check...", "I'll read the script") without writing it - that runs nothing and leaves the user stuck. Either write the command now, or give your final answer.
- Final answers: plain text only, no Markdown or code fences. Do ONLY what was asked - fewest commands, no unrequested double-checks. When the task is done or the user is satisfied ("thanks", "perfect"...), reply ONE short sentence and STOP.
- Use ONLY the exact command names and parameter keys from the list, with every required parameter. Do NOT use ${siteName}'s own features (web search, connectors...) unless the user explicitly asks.
- execute_luau: wrap code in BOTH markers ###LUA### ... ###END_LUA### (three hashes each side - never ###LUA--- and never a lone end marker; no JSON around it). Bare ###LUA### targets "Edit" and only works when Studio is NOT playing. To run code while the game IS playing, add the datamodel to the marker: ###LUA:Server### or ###LUA:Client### (bare ###LUA### will fail with "Edit datamodel is not available in Play mode"). Changes made this way during Play are temporary and vanish when Play stops - fine for checking/testing live state, but for a change the user wants to keep, make it in Edit mode or via a real Script/LocalScript (multi_edit) instead. Use \`return\` for output (print is NOT captured). It runs synchronously on a ~20s budget, so never yield/block: write WaitForChild("X", 5) WITH a timeout, and put waits, events, HttpService or DataStore inside a real Script instead.
- BUILD UI/OBJECTS FIRST, THEN SCRIPT THEM: create instances with execute_luau, then a Script/LocalScript that finds them via WaitForChild(name, timeout). Use runtime Instance.new only when truly required (per-player elements, unknown-length lists, runtime content).
- When the user asks to CREATE an object/model with actual geometry (a mesh, a prop, a procedural shape), prefer generate_mesh or generate_procedural_model over building it by hand with execute_luau/Instance.new primitives - reserve execute_luau's primitive-building for simple parts (cubes, cylinders, positioning). Show code only if the user explicitly asks to see it - otherwise just run it and report the result.
- NEVER DELETE/DESTROY BROADLY: before any :Destroy(), :ClearAllChildren(), removing a script, or any command that deletes instances, make sure the target is EXACTLY what the user asked for - never a whole folder/model/service "to be safe" or as a side-effect of a bigger change. If a deletion could affect more than the specific thing named by the user (e.g. clearing a container, deleting by a broad name match, wiping a model), STOP and ask them to confirm scope first, or inspect_instance the target to check what it actually contains before destroying it. Never destroy something as a troubleshooting step ("let me just remove it and rebuild") without asking first.
- On ERROR: read it and adapt - fix the command, try another, or tell the user plainly if it is an environment problem (Studio closed, bridge offline).
- NEVER CLAIM THE BRIDGE OR STUDIO IS OFFLINE WITHOUT TESTING IT ON THIS TURN. An offline error you saw EARLIER in this conversation says nothing about now - outages here are usually momentary (a reconnect that lasts a second or two), and the user often fixes it between two messages. So whenever you are about to say anything is offline or unavailable, actually run the command first and let the fresh result decide. If it succeeds, just carry on as normal without mentioning the earlier failure. Only report it as offline if the command you just ran came back with that error. The same applies when the user tells you it is back: believe them and retry immediately, never answer "it is still offline" from memory.
- On a property/attribute/value error (e.g. "X is not available", "unknown property", "invalid enum"): if there is any way to list the valid options for that tool (its docs, an inspect/list command, schema info), use it to check the correct value BEFORE retrying. Never guess blindly a second time.

━━━ YOU CAN ACT DIRECTLY IN THE USER'S PROJECT ━━━
This extension gives you real, live access to the user's Roblox Studio place through the commands above - so when a task calls for running code or editing something, you're able to just do it yourself instead of writing instructions for the user to follow (they have no way to paste code back into Studio - only you can run these commands). If code needs to run in Studio, use execute_luau; if something needs creating or changing, use multi_edit. Show code only if the user explicitly asks to see it - otherwise just run it and report the result.

IMPORTANT: Your very first action is to write \`list_commands\` with no params to get the full command reference with parameter details - never guess a command name or parameter that wasn't in that result. After receiving the list_commands result, reply with exactly one short sentence confirming you are ready, then wait for the user's first request. If that first list_commands (or any later command) comes back Studio-offline, Roblox Studio is down - tell the user in one short sentence to open their place in Roblox Studio and enable its MCP server, then wait.`;
    const extra = providerNotes.trim() ? NL + NL + "━━━ ADDITIONAL RULES FOR THIS SITE ━━━" + NL + providerNotes.trim() : "";
    const custom = customPrompt.trim() ? NL + NL + "━━━ USER'S CUSTOM PROMPT (extra instructions from the user) ━━━" + NL + customPrompt.trim() : "";
    return SYS_MARKER + NL + s + extra + custom;
  }

  function toolsReminder(tools) {
    return NL + NL + "────────────────────────────────" + NL + "(System note from Snapgent - this is an automatic REMINDER, not a request and not a new result. Do NOT reply to it or run any command because of it; just keep it in mind for your next command.)" + NL + "Reminder of the Roblox Studio commands (use exact names and parameter keys):" + NL + "  list_commands() - list all available Roblox Studio commands with full parameter details" + NL + compactTools(tools);
  }

  function memoryNudge() { return ""; }

  return {
    APP_NAME: "Snapgent",
    SYS_MARKER: SYS_MARKER,
    RESEND_MARKER: RESEND_MARKER,
    FEEDBACK: FEEDBACK,
    toolCategory: toolCategory,
    buildSystemPrompt: buildSystemPrompt,
    compactTools: compactTools,
    toolsReminder: toolsReminder,
    memoryNudge: memoryNudge,
    TOOL_NOTES: {}
  };
})();
