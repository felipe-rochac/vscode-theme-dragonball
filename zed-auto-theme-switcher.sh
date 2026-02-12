#!/bin/bash
# Auto-switch Zed theme based on time of day or project
# Add to crontab or run as systemd timer

ZED_SETTINGS="$HOME/.config/zed/settings.json"
PROJECT_THEMES="$HOME/.config/zed/project-themes.json"

set_theme() {
    local theme="$1"
    sed -i "s/\"theme\": \".*\"/\"theme\": \"$theme\"/" "$ZED_SETTINGS"
    echo "[$(date)] Theme switched to: $theme" >> "$HOME/.config/zed/theme-switcher.log"
}

# Function to detect current project
get_current_project() {
    # This is a simplified version - you might need to adjust based on how you track active projects
    # Could parse Zed's workspace or use window title
    local zed_workspace=$(pgrep -a zed | grep -oP '(?<=/)[^/]+(?=\s*$)' | head -1)
    echo "$zed_workspace"
}

# Time-based theme switching
time_based_theme() {
    local hour=$(date +%H)
    
    if [ "$hour" -ge 6 ] && [ "$hour" -lt 9 ]; then
        # Morning: Lighter themes
        set_theme "Dragon Ball Goku (Lighter)"
    elif [ "$hour" -ge 9 ] && [ "$hour" -lt 17 ]; then
        # Daytime: Base themes
        set_theme "Dragon Ball Super Saiyan Blue"
    elif [ "$hour" -ge 17 ] && [ "$hour" -lt 21 ]; then
        # Evening: Base or darker
        set_theme "Dragon Ball Vegeta"
    else
        # Night: Darker themes
        set_theme "Dragon Ball Piccolo (Darker)"
    fi
}

# Project-based theme switching
project_based_theme() {
    local project="$1"
    
    if [ -f "$PROJECT_THEMES" ]; then
        local theme=$(jq -r ".\"$project\" // empty" "$PROJECT_THEMES")
        if [ -n "$theme" ]; then
            set_theme "$theme"
            return 0
        fi
    fi
    return 1
}

# Random rotation
random_theme() {
    local themes=(
        "Dragon Ball Goku"
        "Dragon Ball Vegeta"
        "Dragon Ball Gohan"
        "Dragon Ball Piccolo"
        "Dragon Ball Frieza"
        "Dragon Ball Cell"
        "Dragon Ball Majin Buu"
        "Dragon Ball Broly"
        "Dragon Ball Trunks"
        "Dragon Ball Beerus"
        "Dragon Ball Jiren"
        "Dragon Ball Android 18"
        "Dragon Ball Super Saiyan 4"
        "Dragon Ball Super Saiyan Blue"
    )
    
    local random_index=$((RANDOM % ${#themes[@]}))
    set_theme "${themes[$random_index]}"
}

# Main logic
case "${1:-time}" in
    time)
        time_based_theme
        ;;
    project)
        project_based_theme "${2:-$(pwd)}" || time_based_theme
        ;;
    random)
        random_theme
        ;;
    *)
        echo "Usage: $0 {time|project|random} [project_path]"
        exit 1
        ;;
esac
