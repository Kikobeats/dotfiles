#!/bin/bash

# Easier navigation: .., ..., ~ and -
alias ... "cd ../.."
alias .... "cd ../../.."
alias ..... "cd ../../../.."

# Shortcuts
alias c "clear && printf '\e[3J'"
alias dl "cd ~/Downloads"
alias dt "cd ~/Desktop"
alias g='git'
alias v="vim"
alias k="kubectl"
alias pro "cd ~/Projects"
alias rm trash
alias please sudo

# programs
alias subl 'open -a "Sublime Text"'
alias preview "open -a '$PREVIEW'"
alias xcode "open -a '/Developer/Applications/Xcode.app'"
alias filemerge "open -a '/Developer/Applications/Utilities/FileMerge.app'"
alias safari "open -a safari"
alias firefox "open -a firefox"
alias opera "open -a opera"
alias chrome "open -a google\ chrome"
alias chromium "open -a chromium"
alias dashcode "open -a dashcode"
alias macdown "open -a macdown"
alias tower "open -a tower"
alias f 'open -a Finder'
alias fireworks "open -a '/Applications/Adobe Fireworks CS6/Adobe Fireworks CS6.app'"
alias photoshop "open -a '/Applications/Adobe Photoshop CS6/Adobe Photoshop.app'"
alias markoff "open -a Markoff"
alias caret "open -a Caret"

# historial navigation
alias hg 'history | grep'

# real sed after `brew install gnu-sed`
alias sed gsed

# Avoid progress bar and follow redirects
alias curl "curl -s"
alias headers "curl -I -X GET"

# List all files colorized in long format
alias ls exa
alias l "exa --long -a --group --tree --level=1 -F"

alias cat bat
alias less bat
alias diff diff-so-fancy
alias find fd
alias du "ncdu --color dark -rr -x --exclude .git --exclude node_modules"
alias man tldr

# Enhanced WHOIS lookups
alias whois "whois -h whois-servers.net"

alias ping 'prettyping --nolegend'
alias top vtop
alias json 'node -e '\''console.dir(JSON.parse(fs.readFileSync("/dev/stdin", "utf-8")), { depth: null })'\'

# Flush DNS cache
alias dns_flush "sudo killall -HUP mDNSResponder;sudo killall mDNSResponderHelper;sudo dscacheutil -flushcache"
alias dns_setup "networksetup -setdnsservers Wi-Fi 1.1.1.1 1.0.0.1 2606:4700:4700::1111 2606:4700:4700::1001; networksetup -getdnsservers Wi-Fi"

# Firewall
alias firewall_off "sudo defaults write /Library/Preferences/com.apple.alf globalstate -int 0"
alias firewall_on "sudo defaults write /Library/Preferences/com.apple.alf globalstate -int 2"

# git
alias gurl "gh browse"
alias gup 'g up && git-garbage'

# npm
alias npm pnpm
alias npmp "npm publish"
alias npma "npm adduser"
alias npmi "npm install --no-lock"
alias npml "npm list --depth=3"
alias npmu "npm uninstall"
alias npmig "npm install -g"
alias npmlg "npm list -g --depth=0"
alias npmug "npm uninstall -g"
alias npmlink "npm link"
alias npmurl npm-url
alias t "npm test"
alias f flyctl

# Recursively delete `.DS_Store` files
alias cleanup "find . -name '*.DS_Store' -type f -ls -delete"

# support alias inside watch
alias watch 'watch '
alias w "watch "

# File size
alias fs "stat -f \"%z bytes\""

# Hide/show all desktop icons (useful when presenting)
alias hidedesktop "defaults write com.apple.finder CreateDesktop -bool false && killall Finder"
alias showdesktop "defaults write com.apple.finder CreateDesktop -bool true && killall Finder"

# Enable/Disable shadow on screenshots
alias enableshadow "defaults write com.apple.screencapture disable-shadow -bool false ; killall SystemUIServer"
alias disableshadow "defaults write com.apple.screencapture disable-shadow -bool true ; killall SystemUIServer"

# Disable Spotlight
alias spotoff "sudo mdutil -a -i off"
# Enable Spotlight
alias spoton "sudo mdutil -a -i on"

# Kill all the tabs in Chrome to free up memory
# [C] explained: http://www.commandlinefu.com/commands/view/402/exclude-grep-from-your-grepped-output-of-ps-alias-included-in-description
alias chromekill "ps ux | grep '[C]hrome Helper --type=renderer' | grep -v extension-process | tr -s ' ' | cut -d ' ' -f2 | xargs kill"

# Control the system
alias restart 'sudo shutdown -r now'
alias shutdown 'sudo shutdown now'

# kubernetes
alias dp 'kubectl describe pod'
alias dn 'kubectl describe node'
alias tp 'kubectl top pods --sort-by=cpu'
alias tn 'kubectl top nodes --sort-by=cpu'
alias gp 'kubectl get pods -o wide'
alias gn 'kubectl get nodes -o wide'
alias k8s 'watch curl -s https://k8s.microlink.io'
alias k8s-vercel 'watch curl -s https://k8s.microlink.io/vercel'
