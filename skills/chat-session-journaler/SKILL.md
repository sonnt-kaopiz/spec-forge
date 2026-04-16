---
name: chat-session-journaler
description: Generates a structured journal of the current chat session. Invoke this skill whenever the user explicitly says "write journal" in their message. Captures user inputs, abstracted agent reasoning, tools/skills/commands used, key decisions, and final outputs — organized into a readable markdown document. Use this to provide visibility into session flow, debug agent workflows, and identify optimization opportunities.
---

# Chat Session Journaler

When the user says "write journal", generate a structured markdown journal of the current session. The goal is to make the session legible and auditable — useful for spotting inefficiencies, missing context, or gaps in agent behavior.

## What to capture

Work through the conversation from start to finish and extract:

1. **User Inputs** — Each distinct message or request, in order. Note the intent behind each, not just the literal words.

2. **Agent Reasoning (abstracted)** — The key considerations, interpretations, and assumptions made before acting. Do not reproduce raw chain-of-thought. Describe the *thinking* at a high level: what was weighed, what was ruled out, what was assumed.

3. **Agent Actions** — Every tool call, skill invoked, command run, or subagent spawned. Include the sequence — order matters for understanding flow.

4. **Decisions** — Moments where a choice was made between multiple options. Capture *what* was chosen and *why* (or why the rationale wasn't stated, if that's the case).

5. **Outputs** — What was ultimately delivered to the user. Include significant intermediate outputs if they shaped the session's direction.

## Output format

Write the journal as a single markdown document using this structure:

```
# Session Journal

## Overview
A 2–4 sentence summary of the session: what the user was trying to do, how it was approached, and what the outcome was.

## Timeline of Interaction
A chronological log. For each exchange:
- **[Turn N] User:** one-line summary of what the user said/asked
- **[Turn N] System:** what was done in response — reasoning, actions taken, output given

Keep entries brief. The goal is a scannable timeline, not a transcript.

## Decisions & Reasoning Summary
A bulleted list of the meaningful decisions made during the session. Each bullet: the decision, the rationale, and any notable alternatives that were considered or rejected.

## Actions & Tools Used
A list of every tool, skill, command, or agent used. Include:
- Tool/skill/agent name
- Purpose it served in this session
- How many times it was used (if more than once)

## Final Outputs
What was delivered to the user by the end of the session. Be specific: file paths created, summaries written, code changed, answers given.
```

## What to avoid

- Do not reproduce raw internal reasoning or chain-of-thought verbatim — summarize it
- Do not repeat the same information across multiple sections
- Do not pad the journal with generic observations; only include what actually happened
- If a section has nothing meaningful to report, write "None" rather than omitting it

## Tone and length

Write in a neutral, factual tone — this is documentation, not commentary. Keep the journal as short as it can be while remaining complete. A typical session should produce a journal of 200–500 words. Complex sessions with many steps may be longer; short sessions may be much shorter.
