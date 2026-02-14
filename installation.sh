#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf "\n[installation] %s\n" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but not installed." >&2
    exit 1
  fi
}

require_command node
require_command npm

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ is required. Current version: $(node -v)" >&2
  exit 1
fi

log "Installing npm dependencies"
npm install

log "Building project"
npm run build

log "Running tests"
npm test

if [ "${1:-}" = "--no-global" ] || [ "${INSTALL_GLOBAL:-1}" = "0" ]; then
  log "Skipping global install (--no-global or INSTALL_GLOBAL=0)"
else
  log "Installing md2pdf globally"
  npm install -g .
fi

log "Done. Run: md2pdf examples/project-notes.md"
