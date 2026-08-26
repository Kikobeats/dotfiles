function recording_on --description "Hide inline autosuggestions while screen recording"
    set -U fish_autosuggestion_enabled 0
    echo "recording on: autosuggestions hidden"
end
