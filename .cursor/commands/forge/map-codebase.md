---
description: Map the codebase of your entire workspace (or specific services) into four system-level domain documents
---

Read `.cursor/.spec-forge/commands/forge/map-codebase.md` and follow it exactly, with these adaptations:

- **Plugin root** is `.cursor/.spec-forge` — replace every occurrence of `<plugin_root>` with this path
- **Skills**: where the command says "invoke the X skill", read `.cursor/.spec-forge/skills/X/SKILL.md` and execute its instructions inline
- **Agents**: where the command says "spawn the Y agent", read `.cursor/.spec-forge/agents/Y.md` and follow its instructions — you are the agent (no subagent spawning in Cursor)
- **Scripts**: prefix all node script calls with `.cursor/.spec-forge/scripts/`, e.g. `node .cursor/.spec-forge/scripts/update-state.js`

Arguments: $ARGUMENTS
