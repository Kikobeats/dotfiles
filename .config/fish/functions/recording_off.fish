function recording_off --description "Restore inline autosuggestions after screen recording"
    set -U fish_autosuggestion_enabled 1
    echo "recording off: autosuggestions restored"
end
