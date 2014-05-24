![image](http://xaharts.org/funny/i/gitopuss/ironman_octocat.jpg)

# Kikobeats dotfiles

based on [addyosmani dotfiles](https://github.com/addyosmani/dotfiles). Thank you!

### Features

![Imgur](http://i.imgur.com/1sNnJVK.gif)


* Shortcuts for finder, git, browsers, install main apps,....
* Control Dropbox or download youtube audio/videos from terminal.
* Manage virtual RAM Disk for Temporaly files, mount/unmount EFI.
* Extras: Sublime Text Setting up, ODT Template**, iTerm theme.


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
* `.exports`
* `.functions`
* `.extra` - not included, explained above

#### manual run
* `install-deps.sh` - random apps i need installed
* `.osx` - run on a fresh osx machine
* `.brew` - homebrew intialization

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

# RVM settings
[[ -s "$HOME/.rvm/scripts/rvm" ]] && source "$HOME/.rvm/scripts/rvm"

# GNU coreutils
export PATH=$PATH:/usr/local/opt/coreutils/libexec/gnubin

# Dotfiles Custom commands
export PATH="$HOME/dotfiles/utils:$PATH"

# Java Settings
# Ruby Settings
# ....
```
