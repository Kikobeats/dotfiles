#!/usr/bin/env bash

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle

# All shells, once. Same idea as Homebrew's /etc/paths.d/homebrew.
echo "$HOME/dotfiles/bin" | sudo tee /etc/paths.d/dotfiles >/dev/null

./.macos
./link-dropbox.sh
