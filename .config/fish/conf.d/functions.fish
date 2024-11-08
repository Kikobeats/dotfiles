function spot
    rg --color=always --line-number --no-heading --smart-case "$argv" |
    fzf --ansi \
    --color "hl:-1:underline,hl+:-1:underline:reverse" \
    --delimiter : \
    --preview 'bat --color=always {1} --highlight-line {2}' \
    --preview-window 'up,80%,border-bottom,+{2}+3/3,~3' \
    --bind 'enter:become(code -g {1}:{2})'  
end

# support alias inside watch
function w
    watch "fish -c '$argv'"
end

# Kill a process based in the number of the TCP Port.
function killport
    lsof -i tcp:"$argv[1]" | awk 'NR!=1 {print $2}' | xargs kill
end

# git tag and push
# gtp <tag>
function gtp
    command git tag -am "$argv[1]" "$argv[1]" && command git push && command git push --tags
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
    $EDITOR (git status --porcelain | cut -c4-)
end

# Empty Trash
function emptytrash
    set files /Volumes/*/.Trashes
    sudo rm -rfv $files
    sudo rm -rfv ~/.Trash
    # clear Apple’s System Logs to improve shell startup speed
    set files /private/var/log/asl/*.asl
    sudo rm -rfv $files
end

function cl
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
    find $argv -type d -empty -print0 | xargs -0r rmdir -p
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
    if count $argv >/dev/null
        open "$argv"
    else
        open .
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
        if [ -e "$FILE" ]
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

function webmify
    # https://web.dev/replace-gifs-with-videos/#create-webm-videos
    ffmpeg -i "$argv[1]" -c vp9 -b:v 0 -crf 41 "$1.webm"
end

function mp4
    # https://web.dev/replace-gifs-with-videos/#create-mpeg-videos
    ffmpeg -i "$argv[1]" -vf "crop=trunc(iw/2)*2:trunc(ih/2)*2" -b:v 0 -crf 25 -f mp4 -vcodec libx264 -pix_fmt yuv420p "$argv[1]".mp4
end

function docker_prune
    docker system prune -af && docker rmi -f $(docker images -a -q)
end

function docker_bash
    docker run -it --rm "$argv" /bin/bash
end

function filesize
    command ls -l "$argv[1]" | awk '{print $5}' | pretty-bytes
end

function gsync
    # Check if we are in a git repository
    git rev-parse --is-inside-work-tree > /dev/null 2>&1
    if test $status -ne 0
        echo "Not inside a Git repository. Please navigate to a Git repository and try again."
        return 1
    end

    # Get the current branch name
    set current_branch (git rev-parse --abbrev-ref HEAD)

    # Check for uncommitted changes
    if not git diff-index --quiet HEAD --
        echo "You have uncommitted changes. Please commit or stash them before updating."
        return 1
    end

    # Pull the latest changes from the remote repository
    git pull origin $current_branch --rebase > /dev/null 2>&1
    if test $status -ne 0
        echo "Failed to pull latest changes for branch '$current_branch'."
        return 1
    end

    echo "Sync '$current_branch' done"
end
