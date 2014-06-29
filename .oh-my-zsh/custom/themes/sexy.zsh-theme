# colors by http://gabri.me/2013/01/custom-colors-in-your-zsh-prompt/

#function prompt_char {
#    git branch >/dev/null 2>/dev/null && echo '±' && return
#    hg root >/dev/null 2>/dev/null && echo 'Hg' && return
#    echo '○'
#}

function prompt_char {
    git branch >/dev/null 2>/dev/null && echo '$' && return
    hg root >/dev/null 2>/dev/null && echo '$' && return
    echo '$'
}

function virtualenv_info {
    [ $VIRTUAL_ENV ] && echo '('`basename $VIRTUAL_ENV`') '
}

PROMPT='
%{$FG[009]%}%n%{$reset_color%} %{$FG[000]%}% at%{$reset_color%} %{$FG[003]%}%m%{$reset_color%} %{$FG[000]%}% in%{$reset_color%} %{$fg_bold[green]%}${PWD/#$HOME/~}%{$reset_color%}$(git_prompt_info)
$(virtualenv_info)%{$FG[000]%}% $(prompt_char)%{$reset_color%} '

ZSH_THEME_GIT_PROMPT_PREFIX=" %{$FG[000]%}% on %{$FG[141]%}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%{$reset_color%}"
ZSH_THEME_GIT_PROMPT_DIRTY="%{$fg[green]%}!"
ZSH_THEME_GIT_PROMPT_UNTRACKED="%{$fg[green]%}?"
ZSH_THEME_GIT_PROMPT_CLEAN=""






