#!/usr/bin/env bash
cd "$(dirname "$0")"
git pull origin master
function doIt() {
	rsync --exclude ".git/" \
        --exclude ".gitignore" \
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
        -av --no-perms . ~
  fish
}
if [ "$1" == "--force" -o "$1" == "-f" ]; then
	doIt
else
	read -p "This may overwrite existing files in your home directory. Are you sure? (y/n) " -n 1
	echo
	if [[ $REPLY =~ ^[Yy]$ ]]; then
		doIt
	fi
fi
unset doIt