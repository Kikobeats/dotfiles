# Kiko's dotfiles.
===
based on [addy](https://github.com/addyosmani)'s.

## Installation

```bash
git clone https://github.com/addyosmani/dotfiles.git && cd dotfiles && ./sync.sh
```

To update later on, just run the sync again.


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
	

## Syntax highlighting

…is really important. even for these files.

add the below to this file: `~/Library/Application Support/Sublime Text 2/Packages/ShellScript/Shell-Unix-Generic.tmLanguage`

```xml
<string>.aliases</string>
<string>.bash_profile</string>
<string>.bash_prompt</string>
<string>.bashrc</string>
<string>.brew</string>
<string>.exports</string>
<string>.functions</string>
<string>.git</string>
<string>.gitattributes</string>
<string>.gitconfig</string>
<string>.gitignore</string>
<string>.inputrc</string>
<string>.osx</string>
<string>.vim</string>
<string>.vimrc</string>
```



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


