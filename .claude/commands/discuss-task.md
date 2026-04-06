---
description: Discuss a task's gray areas through adaptive questioning before implementing
argument-hint: <task-number>
---

# Discuss Task

Gather implementation context for a spec-forge task through structured questioning. Extract the decisions that agents and implementers need before writing code.

## What This Command Does

1. **Load context**: Read the task file, system architecture, and related upstream/downstream tasks
2. **Check prior decisions**: Skip areas already decided in a `## Decisions` section
3. **Identify gray areas**: Analyze gaps between what the task specifies and what an implementer needs to know
4. **Present areas for discussion**: Show a numbered list — the developer picks which to discuss
5. **Deep-dive**: Ask 2-4 focused questions per selected area
6. **Persist**: Append a `## Decisions` section (or merge into existing one) in the task file

## Implementation Steps

When this command is invoked with `$ARGUMENTS` (a task number like `04`, `04.1`, or `21`):

### 1. Resolve the Task File

Map the argument to a task file in `tasks/`:

```
Argument "04"   → tasks/04-*.md  (glob match)
Argument "04.1" → tasks/04.1-*.md
Argument "21"   → tasks/21-*.md
```

Use the Glob tool to find `tasks/$ARGUMENTS-*.md`. If no match, try `tasks/$ARGUMENTS.md`.

If zero matches: report "No task file found for '$ARGUMENTS'" and stop.
If multiple matches: use the `AskQuestion` tool with `allow_multiple: false` to let the developer pick one.

Read the matched task file in full.

### 2. Check Prior Decisions

Scan the task file content for a `## Decisions` section.

If found:
- Parse existing decisions into a list
- Report them: "Found N prior decisions. These areas are already resolved: [list]"
- These topics will be excluded from gray area analysis

If not found:
- Note that no prior decisions exist — all areas are open

### 3. Read System Architecture

Read `docs/system-architecture.md` in full. This provides:
- Component model and layered responsibilities
- Workflow architecture and state transitions
- Agent roster and data flow
- Configuration architecture
- State management patterns

Hold this context for gray area analysis.

### 4. Read Related Tasks

Open `tasks/TODO.md` and extract the dependency graph.

For the current task, identify:

**Upstream tasks** — tasks listed in the "Depends on" field of the current task file. These produce inputs this task consumes.

**Downstream tasks** — tasks in TODO.md whose "Depends" column references the current task number. These consume this task's output.

Read each upstream and downstream task file (up to 8 files total; skip if more — summarize what was skipped).

After reading, summarize the dependency context:
```
Upstream (inputs):
  - #04 State Schema → provides state.yaml format this task must read/write
  - #09 codebase-researcher → provides research.md this task consumes

Downstream (consumers):
  - #21 /forge:new → will invoke this task's output
  - #22 /forge:resume → will use this task's deliverables
```

### 5. Identify Gray Areas

Analyze the task file against the architecture and related tasks. Look for these categories of ambiguity:

**Interface boundaries** — How does this component connect to adjacent components? What exact inputs does it receive? What exact outputs must it produce? What format/schema?

**Behavioral specifics** — Edge cases, error handling, fallback strategies, ordering constraints, concurrency concerns.

**Technical choices** — When the task says "do X" but doesn't specify how. Tool selection, library choices, data format decisions, algorithm selection.

**Scope boundaries** — What's explicitly in scope vs. what might be assumed? Features that could belong to this task or to a neighbor.

**Convention alignment** — Does the task need to follow patterns established by other tasks? Naming, file locations, output formats that must match.

**Missing acceptance criteria** — Areas where "done" is ambiguous. Testability gaps, verification blind spots.

Filter out any areas already covered by prior decisions (from step 2).

Produce a numbered list of 3-8 gray areas. Each item should be:
- A short title (5-10 words)
- A one-sentence description of why this is ambiguous

### 6. Present Gray Areas for Selection

Use the `AskQuestion` tool to present the gray areas as a multi-select question:

```
title: "Gray areas for task #<N> — <Task Title>"
questions:
  - id: "areas"
    prompt: "Which gray areas should we discuss? (select all that apply)"
    allow_multiple: true
    options:
      - id: "1", label: "<Area title> — <one-sentence description>"
      - id: "2", label: "<Area title> — <one-sentence description>"
      ...
```

Wait for the developer's selection before proceeding.

If the developer selects nothing: report "No areas selected. Nothing to discuss." and stop.

### 7. Deep-Dive Each Selected Area

Process selected areas one at a time, in the order they were listed. For each area:

Use the `AskQuestion` tool to ask 2-4 focused questions. Follow these rules for question design:

- **Questions must be specific** — not "what do you think about X?" but "should X use approach A or approach B?"
- **Use single-select for mutually exclusive choices** — `allow_multiple: false`
- **Use multi-select for additive choices** — `allow_multiple: true` (e.g., "which edge cases should be handled?")
- **Add a free-text escape hatch** — always include an option `"other"` with label `"Other (I'll explain in chat)"` so the developer can break out of the options and clarify in free text
- **Reference the architecture** — ground the question prompt in actual system constraints from system-architecture.md
- **Reference related tasks** — mention how upstream/downstream tasks constrain the answer

Example `AskQuestion` call for an area with two questions:

```
title: "Area 1: Output document schema"
questions:
  - id: "q1_format"
    prompt: "The downstream spec-writer (task #10) consumes this output. Should the output schema be fixed or flexible?"
    allow_multiple: false
    options:
      - id: "fixed",    label: "Fixed template (## Summary, ## Details, ## Key Files) — predictable for downstream agents"
      - id: "flexible", label: "Flexible with required ## Summary only — agents adapt per focus area"
      - id: "other",    label: "Other (I'll explain in chat)"

  - id: "q2_snippets"
    prompt: "Should the output include raw code snippets, or only file:line references for downstream agents to read?"
    allow_multiple: false
    options:
      - id: "snippets",   label: "Include raw code snippets inline — self-contained output"
      - id: "references", label: "File:line references only — keeps documents smaller"
      - id: "both",       label: "Key snippets + file:line references for everything else"
      - id: "other",      label: "Other (I'll explain in chat)"
```

After the developer answers all questions for an area, summarize the decision in one concise paragraph and confirm with a single-question `AskQuestion` call:

```
title: "Confirm decision for: <Area title>"
questions:
  - id: "confirm"
    prompt: "Captured: <one-sentence summary of decision>. Is this correct?"
    allow_multiple: false
    options:
      - id: "yes",    label: "Yes, that's correct"
      - id: "adjust", label: "Not quite — I'll clarify in chat"
```

If the developer selects "adjust": ask them to clarify in chat, then re-summarize and confirm again before moving to the next area.

### 8. Write Decisions to Task File

After all selected areas are discussed, compile the decisions and append them to the task file.

If the task file already has a `## Decisions` section:
- Read the existing content
- Merge new decisions below existing ones
- Use the StrReplace tool to update the section

If no `## Decisions` section exists:
- Append it at the end of the file using the StrReplace tool (replace the last line with last line + new section)

Format:

```markdown
## Decisions

> Discussed on YYYY-MM-DD

### <Area title>
<One-paragraph summary of the decision, including which option was chosen and why>

### <Area title>
<One-paragraph summary>
```

After writing, confirm: "Wrote N decisions to `tasks/<filename>`. These will guide implementation."

## Important Notes

- **DO NOT modify any file other than the task file** — this command is read-only except for the final decision write
- **DO NOT suggest implementation approaches** — extract decisions, don't make them. The developer decides.
- **Present options with trade-offs**, not recommendations — stay neutral
- **Keep questions grounded** — every question should reference a concrete system constraint, not hypotheticals
- **Skip trivially obvious areas** — if the architecture doc already answers it, don't ask
- **Respect prior decisions** — never re-ask about something already in the Decisions section
- **Limit scope** — 3-8 gray areas maximum. If more exist, prioritize by impact on implementation

## Error Handling

If the task file cannot be found:
- Report which glob patterns were tried
- Suggest checking `tasks/TODO.md` for valid task numbers

If the task file has no Description or Deliverables section:
- Report that the task file appears incomplete
- Suggest running the task through spec-generation first

If reading a related task file fails:
- Skip it and note which file was unreadable
- Continue with available context
