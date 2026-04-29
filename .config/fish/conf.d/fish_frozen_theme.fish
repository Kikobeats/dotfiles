# Fish 4.3+ no longer stores color variables in universal scope by default.
# Keep theme colors tracked here so new sessions are deterministic.
set -g fish_color_autosuggestion 4D5566
set -g fish_color_cancel -r
set -g fish_color_command 39BAE6
set -g fish_color_comment 626A73
set -g fish_color_cwd 59C2FF
set -g fish_color_cwd_root red
set -g fish_color_end F29668
set -g fish_color_error FF3333
set -g fish_color_escape 95E6CB
set -g fish_color_history_current --bold
set -g fish_color_host normal
set -g fish_color_host_remote yellow
set -g fish_color_match F07178
set -g fish_color_normal B3B1AD
set -g fish_color_operator E6B450
set -g fish_color_param B3B1AD
set -g fish_color_quote C2D94C
set -g fish_color_redirection FFEE99
set -g fish_color_search_match --background=E6B450
set -g fish_color_selection --background=E6B450
set -g fish_color_status red
set -g fish_color_user brgreen
set -g fish_color_valid_path --underline

set -g fish_pager_color_completion normal
set -g fish_pager_color_description B3A06D yellow
set -g fish_pager_color_prefix normal --bold --underline
set -g fish_pager_color_progress brwhite --background=cyan
set -g fish_pager_color_selected_background -r
