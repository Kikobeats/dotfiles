# Kiko's dotfiles.

![image](http://xaharts.org/funny/i/gitopuss/ironman_octocat.jpg)

based on [addyosmani dotfiles](https://github.com/addyosmani/dotfiles).Thank you!

## Installation

```bash
git clone https://github.com/Kikobeats/dotfiles  && cd dotfiles && ./sync-local.sh
```

To update later on, just run `sync-remote.sh` the sync again.


## Private Settings

Create a file `.extra` in `$HOME` and put here your private settings.

Example:

   	# Git credentials
	# Not in the repository, to prevent people from accidentally committing under my name
	GIT_AUTHOR_NAME="Mathias Bynens"
	GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
	git config --global user.name "$GIT_AUTHOR_NAME"
	GIT_AUTHOR_EMAIL="mathias@mailinator.com"
	GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
	git config --global user.email "$GIT_AUTHOR_EMAIL"
	
	export PATH="$HOME/dotfiles/utils:$PATH"
	
	....
	

## Edit files Syntax highlighting


To edit the files, I recommend [this](https://github.com/mattbanks/dotfiles-syntax-highlighting-st2) bundle for **Sublime Text**


### Sensible OS X defaults

When setting up a new Mac, you may want to set some sensible OS X defaults:

```bash
./.osx
```

## Similar projects

I recommend getting a [`.jshintrc`](https://github.com/jshint/node-jshint/blob/master/.jshintrc) and [`.editorconfig`](http://editorconfig.org/) defined for all your projects.





## overview of files

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


