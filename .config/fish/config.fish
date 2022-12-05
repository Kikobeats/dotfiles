if status is-interactive
    # Initialize `zoxide`
    zoxide init fish | source

    # load `rbenv`
    # rbenv init - fish | source

    if test -e ~/.extra
        source ~/.extra
    end
end
