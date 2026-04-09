---
description: Run the verification pipeline (test → analyze → format → code review) for the current phase
---

Read `.cursor/.spec-forge/commands/forge/verify.md` and follow it exactly, with these adaptations:

- **Plugin root** is `.cursor/.spec-forge` — replace every occurrence of `<plugin_root>` with this path
- **Skills**: where the command says "invoke the X skill", read `.cursor/.spec-forge/skills/X/SKILL.md` and execute its instructions inline
- **Agents**: where the command says "spawn the Y agent", read `.cursor/.spec-forge/agents/Y.md` and follow its instructions — you are the agent (no subagent spawning in Cursor)
- **Scripts**: prefix all node script calls with `.cursor/.spec-forge/scripts/`, e.g. `node .cursor/.spec-forge/scripts/verify.js`

Arguments: $ARGUMENTS
