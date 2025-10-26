#!/usr/bin/env bash

set -euo pipefail

DROPBOX_APPDATA="$HOME/Dropbox/AppData"

sync_to_dropbox() {
  local src="$1"                  # absolute path to local config folder
  local rel_dst="$2"              # path inside Dropbox/AppData
  local dst="$DROPBOX_APPDATA/$rel_dst"

  echo "→ Syncing: $src"
  echo "   ↳ to Dropbox: $dst"

  # Ensure parent Dropbox folder exists
  mkdir -p "$(dirname "$dst")"

  # If Dropbox destination doesn't exist, move local folder
  if [ ! -d "$dst" ]; then
    if [ -d "$src" ]; then
      echo "  📦 Moving existing folder to Dropbox..."
      mv "$src" "$dst"
    else
      echo "  ⚠️  Local folder not found, creating empty Dropbox folder."
      mkdir -p "$dst"
    fi
  else
    echo "  ✅ Dropbox destination already exists."
  fi

  # Remove any existing local folder or symlink
  if [ -L "$src" ]; then
    echo "  🔗 Old symlink found — removing."
    rm "$src"
  elif [ -d "$src" ]; then
    echo "  🧹 Removing old local folder."
    rm -rf "$src"
  fi

  # Create symlink
  echo "  🔗 Linking $src → $dst"
  ln -s "$dst" "$src"

  echo "  ✅ Sync complete for: $src"
  echo
}

# sync_to_dropbox "$HOME/Library/Application Support/Code/User" ".vscode/User"
sync_to_dropbox "$HOME/Library/Application Support/Cursor/User" ".cursor/User"