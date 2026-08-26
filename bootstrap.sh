#!/usr/bin/env bash

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle

# All shells, once. Same idea as Homebrew's /etc/paths.d/homebrew.
echo "$HOME/dotfiles/bin" | sudo tee /etc/paths.d/dotfiles >/dev/null
echo "$HOME/Library/pnpm/bin" | sudo tee /etc/paths.d/pnpm >/dev/null
echo "$HOME/.local/bin" | sudo tee /etc/paths.d/local >/dev/null

./.macos
./link-dropbox.sh
