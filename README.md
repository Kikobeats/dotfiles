![image](http://xaharts.org/funny/i/gitopuss/ironman_octocat.jpg)

# Kikobeats dotfiles

based on [addyosmani dotfiles](https://github.com/addyosmani/dotfiles). Thank you!

### Features

Compatible with Bash and ZSH shells

#### Bash

![Imgur](http://i.imgur.com/1sNnJVK.gif)

#### ZSH

![Imgur](http://i.imgur.com/6B4MD0n.gif)

* Install common package manager (brew, npm, gem) and common dependencies  (linters, findutils, redis, mongo, bash,...)
* Install common apps based on [Caskfile](https://github.com/Kikobeats/dotfiles/blob/master/Caskfile).
* Many useful alias for terminal: git, browsers, apps shortcuts, finder, hidden/show icons desktop, youtube downloader, RAMDisk,...
* Custom command for update and clean the system, dropbox, js2CoffePro, nodev, RAMDisk, mount/unmount EFI,...
* Extras like Snippets and shortcuts for Sublime Text, Custom template for iTerm and LibreOffice.


### Installation
#### Install Repository

```bash
git clone https://github.com/Kikobeats/dotfiles  && cd dotfiles && ./sync-local.sh
```

#### Install files Syntax highlighting (Sublime Text)

```
Install Packages > Dotfiles Syntax Highlighting for Sublime Text 2/3
```

### File structure
####  Automatic config

* `.ackrc` - for ack (better than grep)
* `.vimrc`, `.vim` - vim config, obv.

#### shell environement

* `.aliases`
* `.bash_profile`
* `.bash_prompt`
* `.bashrc`
* `.zshrc`
* `.exports`
* `.functions`
* `.extra` - not included, explained above


#### manual run

* `install-deps.sh` - Common dependencies (Python, Node, Ruby, etc)
* `.osx` - Run on a fresh osx machine
* `.brew` - Homebrew intialization

#### git, brah

* `.git`
* `.gitattributes`
* `.gitconfig`
* `.gitignore`
* `.inputrc` - config for bash readline

### Configure

### Set up new computer

Install dependencies

```bash
./install-deps.sh && ./.brew
```

When setting up a new Mac, you may want to set some sensible OS X defaults:

```bash
./.osx
```

Install Caskfile apps with:

```bash
brew bundle Caskfile
```

#### Private Settings

Create a file `.extra` in `$HOME` and put here your private settings.

Example:

```bash
# Git credentials
# Not in the repository, to prevent people from accidentally committing under my name
GIT_AUTHOR_NAME="Mathias Bynens"
GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
git config --global user.name "$GIT_AUTHOR_NAME"
GIT_AUTHOR_EMAIL="mathias@mailinator.com"
GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
git config --global user.email "$GIT_AUTHOR_EMAIL"

# GNU coreutils
export PATH=$PATH:/usr/local/opt/coreutils/libexec/gnubin

# Dotfiles Custom commands
export PATH="$HOME/dotfiles/utils:$PATH"

# Java Settings
# Ruby Settings
# ....
```

### Other

* [Special SSD Optimizations](http://www.hightechdad.com/2014/10/23/13-tips-optimize-mac-yosemite-installation)

