#!/bin/bash

# up to you (me) if you want to run this as a file or copy paste at your leisure
sudo chmod -R +x ~/dotfiles

# homebrew!
# you need the code CLI tools YOU FOOL.
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# fix spotlight
curl -O https://raw.githubusercontent.com/fix-macosx/fix-macosx/master/fix-macosx.py && /usr/bin/python fix-macosx.py

# iterm2 integration
curl -L https://iterm2.com/misc/install_shell_integration.sh | bash

