#!/usr/bin/env bash

cd "$(dirname "$0")"

main() {
  rsync --exclude ".git/" \
        --exclude ".gitignore" \
        --exclude ".config/fish/fish_variables" \
        --exclude "install-deps.sh" \
        --exclude ".DS_Store" \
        --exclude "sync-remote.sh" \
        --exclude "sync-local.sh" \
        --exclude "README.md" \
        --exclude "LICENSE.md" \
        --exclude "init" \
        --exclude "utils" \
        --exclude "sync.sh" \
        --exclude "Caskfile" \
        --exclude "skills/" \
        -av --no-perms . ~
  # Cursor agents search /usr/local/bin before Homebrew; the shim must win there.
  target="$HOME/dotfiles/bin/pnpm"
  link=/usr/local/bin/pnpm
  if [ -e "$target" ] && [ "$(readlink "$link" 2>/dev/null)" != "$target" ]; then
    sudo ln -sfn "$target" "$link"
  fi
  # New laptops get this from bootstrap.sh; keep it true on sync too.
  if [ "$(cat /etc/paths.d/dotfiles 2>/dev/null)" != "$HOME/dotfiles/bin" ]; then
    echo "$HOME/dotfiles/bin" | sudo tee /etc/paths.d/dotfiles >/dev/null
  fi
  fish
}

if [[ "$1" == "--force" ]] || [[ "$1" == "-f" ]]; then
  main
else
  read -rp "This may overwrite existing files in your home directory. Are you sure? (y/n) " -n 1
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    main
  fi
fi

unset main