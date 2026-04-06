# Common test helpers shared across all spec-forge test suites.

SCRIPTS_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)/scripts"
TEMPLATES_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)/templates"

# Create an isolated temp workspace for a test and register it for cleanup.
# Sets $WORKSPACE (exported for use in tests).
setup_workspace() {
  WORKSPACE="$(mktemp -d)"
  export WORKSPACE
}

# Remove the temp workspace created by setup_workspace.
teardown_workspace() {
  [[ -n "${WORKSPACE:-}" && -d "$WORKSPACE" ]] && rm -rf "$WORKSPACE"
}

# Return the path of the tasks directory inside $WORKSPACE.
tasks_dir() {
  echo "${WORKSPACE}/.ai-workflow/tasks"
}

# Assert that a file exists.
assert_file_exists() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Expected file to exist: $file" >&3
    return 1
  fi
}

# Assert that a directory exists.
assert_dir_exists() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Expected directory to exist: $dir" >&3
    return 1
  fi
}

# Assert a file contains a given string.
assert_file_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -qF "$pattern" "$file" 2>/dev/null; then
    echo "Expected '$file' to contain: $pattern" >&3
    echo "Actual contents:" >&3
    cat "$file" >&3
    return 1
  fi
}

# Assert a file does NOT contain a given string.
assert_file_not_contains() {
  local file="$1"
  local pattern="$2"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    echo "Expected '$file' NOT to contain: $pattern" >&3
    return 1
  fi
}
