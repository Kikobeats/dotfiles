if status is-interactive    
    # load `mcfly`
    mcfly init fish | source

    # Initialize `zoxide`
    zoxide init fish | source

    if test -e ~/.extra
        source ~/.extra
    end
end

