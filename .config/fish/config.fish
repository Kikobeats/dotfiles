if status is-interactive
    # Initialize `zoxide`
    zoxide init fish | source
    if test -e ~/.extra
        source ~/.extra
    end
end


if type -q pnpm
    set -gx PNPM_HOME /Users/kikobeats/Library/pnpm
    set -gx PATH "$PNPM_HOME" $PATH
end
