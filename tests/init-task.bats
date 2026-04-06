#!/usr/bin/env bats
# Tests for scripts/init-task.sh

load helpers/common

SCRIPT="${SCRIPTS_DIR}/init-task.sh"

setup()    { setup_workspace; }
teardown() { teardown_workspace; }

# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

@test "exits with error when no slug is provided" {
  run bash "$SCRIPT" "" "$WORKSPACE"
  [ "$status" -eq 1 ]
  [[ "$output" =~ "task-slug is required" ]]
}

@test "exits with error when slug has uppercase letters" {
  run bash "$SCRIPT" "Add-Feature" "$WORKSPACE"
  [ "$status" -eq 1 ]
  [[ "$output" =~ "lowercase" ]]
}

@test "exits with error when slug starts with a hyphen" {
  run bash "$SCRIPT" "-bad-slug" "$WORKSPACE"
  [ "$status" -eq 1 ]
}

@test "exits with error when slug ends with a hyphen" {
  run bash "$SCRIPT" "bad-slug-" "$WORKSPACE"
  [ "$status" -eq 1 ]
}

@test "exits with error when slug contains spaces" {
  run bash "$SCRIPT" "bad slug" "$WORKSPACE"
  [ "$status" -eq 1 ]
}

@test "exits with error when slug contains special characters" {
  run bash "$SCRIPT" "bad_slug!" "$WORKSPACE"
  [ "$status" -eq 1 ]
}

@test "accepts a single-character slug" {
  run bash "$SCRIPT" "a" "$WORKSPACE"
  [ "$status" -eq 0 ]
}

@test "accepts a slug with digits" {
  run bash "$SCRIPT" "fix-bug-42" "$WORKSPACE"
  [ "$status" -eq 0 ]
}

# ---------------------------------------------------------------------------
# Directory structure
# ---------------------------------------------------------------------------

@test "creates .ai-workflow/tasks/ when it does not exist" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)"
}

@test "creates task directory named SF-001-<slug> for the first task" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-001-new-feature"
}

@test "creates services/ subdirectory" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-001-new-feature/services"
}

@test "creates phases/ subdirectory" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-001-new-feature/phases"
}

@test "creates logs/ subdirectory" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-001-new-feature/logs"
}

# ---------------------------------------------------------------------------
# Template files installed
# ---------------------------------------------------------------------------

@test "creates spec.md" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/spec.md"
}

@test "creates research.md" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/research.md"
}

@test "creates external-research.md" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/external-research.md"
}

@test "creates architecture.md" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/architecture.md"
}

@test "creates plan.md" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/plan.md"
}

@test "creates state.yaml" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_exists "$(tasks_dir)/SF-001-new-feature/state.yaml"
}

# ---------------------------------------------------------------------------
# Placeholder substitution
# ---------------------------------------------------------------------------

@test "state.yaml contains the correct task ID" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/state.yaml" 'id: "SF-001"'
}

@test "state.yaml contains the correct slug" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/state.yaml" 'slug: "new-feature"'
}

@test "state.yaml has status set to discovery" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/state.yaml" 'status: "discovery"'
}

@test "state.yaml has created_at populated (not a raw placeholder)" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_not_contains "$(tasks_dir)/SF-001-new-feature/state.yaml" "{{CREATED_AT}}"
}

@test "state.yaml has slug in branch comment" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/state.yaml" "feature/new-feature"
}

@test "spec.md contains the correct task ID" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/spec.md" "SF-001"
}

@test "spec.md contains the correct slug" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_file_contains "$(tasks_dir)/SF-001-new-feature/spec.md" "new-feature"
}

@test "no file contains unreplaced {{TASK_ID}} placeholder" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  local task_dir
  task_dir="$(tasks_dir)/SF-001-new-feature"
  for f in "$task_dir"/*.md "$task_dir/state.yaml"; do
    if grep -qF "{{TASK_ID}}" "$f" 2>/dev/null; then
      echo "Unreplaced {{TASK_ID}} found in $f" >&3
      return 1
    fi
  done
}

@test "no file contains unreplaced {{TASK_SLUG}} placeholder" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  local task_dir
  task_dir="$(tasks_dir)/SF-001-new-feature"
  for f in "$task_dir"/*.md "$task_dir/state.yaml"; do
    if grep -qF "{{TASK_SLUG}}" "$f" 2>/dev/null; then
      echo "Unreplaced {{TASK_SLUG}} found in $f" >&3
      return 1
    fi
  done
}

# ---------------------------------------------------------------------------
# Auto-increment task ID
# ---------------------------------------------------------------------------

@test "second task gets ID SF-002" {
  bash "$SCRIPT" "first-task" "$WORKSPACE"
  run bash "$SCRIPT" "second-task" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-002-second-task"
}

@test "third task gets ID SF-003 when two already exist" {
  bash "$SCRIPT" "task-one" "$WORKSPACE"
  bash "$SCRIPT" "task-two" "$WORKSPACE"
  run bash "$SCRIPT" "task-three" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-003-task-three"
}

@test "auto-increment skips gaps (resumes after highest existing ID)" {
  # Pre-create SF-005 manually — next should be SF-006
  mkdir -p "$(tasks_dir)/SF-005-old-task"
  run bash "$SCRIPT" "new-task" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-006-new-task"
}

@test "task IDs are zero-padded to three digits" {
  run bash "$SCRIPT" "padded" "$WORKSPACE"
  [ "$status" -eq 0 ]
  assert_dir_exists "$(tasks_dir)/SF-001-padded"
}

# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------

@test "running twice for the same slug succeeds without error" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  run bash "$SCRIPT" "my-task" "$WORKSPACE"
  [ "$status" -eq 0 ]
}

@test "running twice does not create a second directory for the same slug" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  local count
  count=$(find "$(tasks_dir)" -mindepth 1 -maxdepth 1 -type d -name "SF-*-my-task" | wc -l | tr -d ' ')
  [ "$count" -eq 1 ]
}

@test "running twice preserves original state.yaml content" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  local state_file
  state_file="$(tasks_dir)/SF-001-my-task/state.yaml"
  # Overwrite with sentinel content
  echo "sentinel" > "$state_file"
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  run cat "$state_file"
  [[ "$output" == "sentinel" ]]
}

@test "running twice preserves existing spec.md content" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  local spec_file
  spec_file="$(tasks_dir)/SF-001-my-task/spec.md"
  echo "custom spec content" > "$spec_file"
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  run cat "$spec_file"
  [[ "$output" == "custom spec content" ]]
}

@test "second run does not bump the task ID for the same slug" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  assert_dir_exists "$(tasks_dir)/SF-001-my-task"
  run test -d "$(tasks_dir)/SF-002-my-task"
  [ "$status" -ne 0 ]
}

@test "second run reports idempotent mode in output" {
  bash "$SCRIPT" "my-task" "$WORKSPACE"
  run bash "$SCRIPT" "my-task" "$WORKSPACE"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "already exists" ]]
}

# ---------------------------------------------------------------------------
# Output / reporting
# ---------------------------------------------------------------------------

@test "success output includes task ID" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "SF-001" ]]
}

@test "success output includes the slug" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "new-feature" ]]
}

@test "success output includes the task directory path" {
  run bash "$SCRIPT" "new-feature" "$WORKSPACE"
  [ "$status" -eq 0 ]
  [[ "$output" =~ ".ai-workflow/tasks" ]]
}
