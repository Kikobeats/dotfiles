if status is-interactive
    # Initialize `zoxide`
    zoxide init fish | source
    if test -e ~/.extra
        source ~/.extra
    end
end

# Keep essential user paths in tracked config instead of universal variables.
# ~/dotfiles/bin first so the pnpm shim wraps Homebrew's binary (`brew link` is fine).
set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path -g -p $HOME/dotfiles/bin $PNPM_HOME/bin /opt/homebrew/sbin /opt/homebrew/bin

fzf_configure_bindings \
    --history=\cr \
    --variables=\cv \
    --git_log=\cl \
    --git_status=\cs \
    --processes=\cp \
    --directory=\cf
