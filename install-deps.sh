#!/bin/bash

# up to you (me) if you want to run this as a file or copy paste at your leisure
sudo chmod -R +x ~/dotfiles

# https://rvm.io
# rvm for the rubiess
# curl -sSL https://get.rvm.io | bash -s stable
# source "$HOME"/.rvm/scripts/rvm | rvm install ruby-head

# homebrew!
# you need the code CLI tools YOU FOOL.
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# https://github.com/rupa/z
# z, oh how i love you
curl https://raw.github.com/rupa/z/master/z.sh > ~/dotfiles/utils/z

# fix spotlight
curl -O https://fix-macosx.com/fix-macosx.py && /usr/bin/python fix-macosx.py

# iterm2 integration
curl -L https://iterm2.com/misc/install_shell_integration.sh | bash

