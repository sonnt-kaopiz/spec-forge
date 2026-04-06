#!/usr/bin/env bash
# init-task.sh — Initialize a new task directory under <workspace_root>/.ai-workflow/tasks/
#
# Usage:
#   ./init-task.sh <task-slug> [workspace_root]
#
# Arguments:
#   task-slug       Short kebab-case label (e.g. "add-user-notifications")
#   workspace_root  Path to the service repo root. Defaults to $PWD.
#
# Behaviour:
#   - Auto-increments task ID by scanning existing SF-* directories
#   - Idempotent: safe to run multiple times; never overwrites existing files
#   - Creates all required subdirectories and populates files from templates

set -euo pipefail

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
SLUG="${1:-}"
WORKSPACE_ROOT="${2:-$PWD}"

if [[ -z "$SLUG" ]]; then
  echo "Error: task-slug is required." >&2
  echo "Usage: $0 <task-slug> [workspace_root]" >&2
  exit 1
fi

# Validate slug — only lowercase letters, digits, hyphens
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$ ]]; then
  echo "Error: task-slug must be lowercase letters, digits, and hyphens only (e.g. add-user-notifications)." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TASKS_DIR="${WORKSPACE_ROOT}/.ai-workflow/tasks"
FORGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # spec-forge root
TEMPLATES_DIR="${FORGE_DIR}/templates"

# ---------------------------------------------------------------------------
# Auto-increment task ID
# ---------------------------------------------------------------------------
get_next_task_id() {
  local max=0
  if [[ -d "$TASKS_DIR" ]]; then
    while IFS= read -r -d '' entry; do
      dir_name="$(basename "$entry")"
      # Match SF-NNN-* or SF-NNN (no suffix)
      if [[ "$dir_name" =~ ^SF-([0-9]+) ]]; then
        num="${BASH_REMATCH[1]}"
        # Strip leading zeros for arithmetic
        num=$((10#$num))
        if (( num > max )); then
          max=$num
        fi
      fi
    done < <(find "$TASKS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)
  fi
  echo $(( max + 1 ))
}

TASK_NUM=$(get_next_task_id)
TASK_ID=$(printf "SF-%03d" "$TASK_NUM")
TASK_DIR="${TASKS_DIR}/${TASK_ID}-${SLUG}"

# ---------------------------------------------------------------------------
# Guard: if a directory for this slug already exists at any SF-* number, reuse it
# ---------------------------------------------------------------------------
if [[ -d "$TASKS_DIR" ]]; then
  existing=$(find "$TASKS_DIR" -mindepth 1 -maxdepth 1 -type d -name "SF-*-${SLUG}" 2>/dev/null | head -1)
  if [[ -n "$existing" ]]; then
    TASK_DIR="$existing"
    TASK_ID=$(basename "$existing" | grep -oE '^SF-[0-9]+')
    echo "Task directory already exists: $TASK_DIR"
    echo "Ensuring all files and subdirectories are present (idempotent mode)."
  fi
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------------------
# Create directory structure
# ---------------------------------------------------------------------------
mkdir -p \
  "${TASK_DIR}/services" \
  "${TASK_DIR}/phases" \
  "${TASK_DIR}/logs"

echo "Task directory: $TASK_DIR"

# ---------------------------------------------------------------------------
# Helper: copy a template file if the destination does not already exist.
# Substitutes: {{TASK_ID}}, {{TASK_SLUG}}, {{TASK_TITLE}}, {{CREATED_AT}},
#              {{CREATED_DATE}} (date-only portion of CREATED_AT)
# ---------------------------------------------------------------------------
install_template() {
  local template_file="$1"
  local dest_file="$2"

  if [[ -f "$dest_file" ]]; then
    echo "  [skip]   $dest_file (already exists)"
    return
  fi

  if [[ ! -f "$template_file" ]]; then
    echo "  [warn]   Template not found: $template_file — creating empty file" >&2
    touch "$dest_file"
    return
  fi

  local date_only="${NOW%%T*}"   # e.g. 2026-04-06

  sed \
    -e "s|{{TASK_ID}}|${TASK_ID}|g" \
    -e "s|{{TASK_SLUG}}|${SLUG}|g" \
    -e "s|{{TASK_TITLE}}|${SLUG}|g" \
    -e "s|{{CREATED_AT}}|${NOW}|g" \
    -e "s|{{CREATED_DATE}}|${date_only}|g" \
    "$template_file" > "$dest_file"

  echo "  [create] $dest_file"
}

# ---------------------------------------------------------------------------
# Install all templates (markdown docs + state.yaml)
# ---------------------------------------------------------------------------
install_template "${TEMPLATES_DIR}/spec.md"               "${TASK_DIR}/spec.md"
install_template "${TEMPLATES_DIR}/research.md"           "${TASK_DIR}/research.md"
install_template "${TEMPLATES_DIR}/external-research.md"  "${TASK_DIR}/external-research.md"
install_template "${TEMPLATES_DIR}/architecture.md"       "${TASK_DIR}/architecture.md"
install_template "${TEMPLATES_DIR}/plan.md"               "${TASK_DIR}/plan.md"
install_template "${TEMPLATES_DIR}/state.yaml"            "${TASK_DIR}/state.yaml"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "Task initialised successfully."
echo "  ID   : ${TASK_ID}"
echo "  Slug : ${SLUG}"
echo "  Dir  : ${TASK_DIR}"
echo ""
echo "Next step: fill in spec.md, then run /forge:spec to generate a full specification."
