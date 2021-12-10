#!/bin/bash

# Kill a process based in the number of the TCP Port.
function killport 
  lsof -i tcp:"$argv[1]" | awk 'NR!=1 {print $argv[1]}' | xargs kill
end

# git tag and push
# gtp <tag>
function gtp 
  command git tag -am "$argv[1]" "$argv[1]" && \
  command git push && \
  command git push --tags
end

# delete a git tag
function gtd
  command git tag -d "$argv[1]"
  command git push origin :refs/tags/"$argv[1]"
  command git tag -d "$argv[1]"
end

# delete a git branch
function gbd
  command git branch -D "$argv[1]"
  command git push origin --delete "$argv[1]"
end

# See the contributors of a git repository
function gcredits
  command git shortlog -sn
end

function gtoday
  command git diff --shortstat "@{0 day ago}"
end

# open all changed files (that still actually exist) in the editor
function geditor
  $EDITOR (git status --porcelain | awk '{print $argv[1]')
end

# Empty Trash
function  emptytrash
  sudo rm -rfv "/Volumes/*/.Trashes"
  sudo rm -rfv "~/.Trash"
  # clear Apple’s System Logs to improve shell startup speed
  sudo rm -rfv "/private/var/log/asl/*.asl"
end

function  cl 
  builtin cd "$argv" && ls
end

# Create a new directory and enter it
function mc
  mkdir -p "$argv" && cd "$argv"
end

# find shorthand
function f
  find . -name "$argv[1]"
end

# prune a set of empty directories
function prunedir 
  find $argv -type d -empty -print0 | xargs -0r rmdir -p ;
end

# take this repo and copy it to somewhere else minus the .git stuff.
function gitexport
  mkdir -p "$argv[1]"
  git archive master | tar -x -C "$argv[1]"
end

# get gzipped size
function gz
  echo "orig size    (bytes): "
  cat "$argv[1]" | wc -c
  echo "gzipped size (bytes): "
  gzip -c "$argv[1]" | wc -c
end

# All the dig info
function digga
  dig +nocmd "$argv[1]" any +multiline +noall +answer
end

# `o` with no arguments opens current directory, otherwise opens the given
# location
function o
  if [ count $argv -eq 0 ];
    open .
  else
    open "$argv"
  end
end

# Launch installed browsers for a specific URL
# Usage: browsers "http://www.google.com"
function browsers
  chrome "$argv[1]"
  opera "$argv[1]"
  firefox "$argv[1]"
  safari "$argv[1]"
end

function static
  browser-sync start --server --files "index.html, **/*.(css|js|md)"
end

function ia
  for FILE in "$argv"
  do
    if [ -e "$FILE" ];
      open -a "iA Writer" "$FILE"
    else
      touch "$FILE"
      open -a "iA Writer" "$FILE"
    end
  end
end

# direct it all to /dev/null
function devnull
  "$argv" >/dev/null 2>&1
end

# turn that video into webm.
# brew reinstall ffmpeg --with-libvpx
function webmify
  ffmpeg -i "$argv[1]" -vcodec libvpx -acodec libvorbis -isync -copyts -aq 80 -threads 3 -qmax 30 -y "$argv[1]" "$1.webm"
end

function mp4
  ffmpeg -i "$argv[1]" -vcodec libx264 -preset veryfast "$1.mp4"
end

function docker_prune
  docker system prune -af && docker rmi f(docker images -a -q)
end

