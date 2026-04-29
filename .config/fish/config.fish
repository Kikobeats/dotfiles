if status is-interactive
    # Initialize `zoxide`
    zoxide init fish | source
    if test -e ~/.extra
        source ~/.extra
    end
end

# Keep essential user paths in tracked config instead of universal variables.
set -l dotfiles_bin "$HOME/dotfiles/bin"
if test -d /opt/homebrew/bin
    fish_add_path -g -p /opt/homebrew/bin
end

if test -d /opt/homebrew/sbin
    fish_add_path -g -p /opt/homebrew/sbin
end

if test -d "$dotfiles_bin"
    fish_add_path -g -p "$dotfiles_bin"
end


if type -q pnpm
    set -gx PNPM_HOME /Users/kikobeats/Library/pnpm
    set -gx PATH "$PNPM_HOME" $PATH
end

fzf_configure_bindings \
    --history=\cr \
    --variables=\cv \
    --git_log=\cl \
    --git_status=\cs \
    --processes=\cp \
    --directory=\cf
