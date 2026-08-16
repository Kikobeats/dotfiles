if status is-interactive
    # Initialize `zoxide`
    zoxide init fish | source
    if test -e ~/.extra
        source ~/.extra
    end
end

# Fish PATH for this machine (Homebrew is not on the default macOS PATH).
# Agents do not read this file; the pnpm shim is /usr/local/bin/pnpm.
set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path -g -m -p $HOME/dotfiles/bin $PNPM_HOME/bin /opt/homebrew/sbin /opt/homebrew/bin

fzf_configure_bindings \
    --history=\cr \
    --variables=\cv \
    --git_log=\cl \
    --git_status=\cs \
    --processes=\cp \
    --directory=\cf
