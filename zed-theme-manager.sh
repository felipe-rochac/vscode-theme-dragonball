#!/bin/bash
# Dragon Ball Zed Theme Manager
# Usage: ./zed-theme-manager.sh [random|select|project|rotate]

ZED_SETTINGS="$HOME/.config/zed/settings.json"
THEME_LIST=(
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
    "Dragon Ball Dragon Ball"
)

# Add variant suffixes
ALL_THEMES=()
for theme in "${THEME_LIST[@]}"; do
    ALL_THEMES+=("$theme")
    ALL_THEMES+=("$theme (Darker)")
    ALL_THEMES+=("$theme (Lighter)")
done

set_theme() {
    local theme="$1"
    
    # Backup settings
    cp "$ZED_SETTINGS" "$ZED_SETTINGS.bak"
    
    # Update theme in settings.json
    if grep -q '"theme":' "$ZED_SETTINGS"; then
        # Replace existing theme
        sed -i "s/\"theme\": \".*\"/\"theme\": \"$theme\"/" "$ZED_SETTINGS"
    else
        # Add theme if it doesn't exist
        sed -i 's/{/{\n  "theme": "'"$theme"'",/' "$ZED_SETTINGS"
    fi
    
    echo "✓ Theme set to: $theme"
    echo "  (Restart Zed or reload window to see changes)"
}

random_theme() {
    local random_index=$((RANDOM % ${#ALL_THEMES[@]}))
    local selected="${ALL_THEMES[$random_index]}"
    echo "🎲 Randomly selected: $selected"
    set_theme "$selected"
}

select_theme() {
    echo "Available Dragon Ball Themes:"
    echo ""
    
    local i=1
    for theme in "${ALL_THEMES[@]}"; do
        printf "%2d. %s\n" "$i" "$theme"
        ((i++))
    done
    
    echo ""
    read -p "Select theme number (1-${#ALL_THEMES[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le "${#ALL_THEMES[@]}" ]; then
        local selected="${ALL_THEMES[$((selection-1))]}"
        set_theme "$selected"
    else
        echo "❌ Invalid selection"
        exit 1
    fi
}

project_theme() {
    local project_dir="$(pwd)"
    local project_name="$(basename "$project_dir")"
    
    # Create project theme mapping file
    local theme_map="$HOME/.config/zed/project-themes.json"
    
    if [ ! -f "$theme_map" ]; then
        echo "{}" > "$theme_map"
    fi
    
    # Check if project already has a theme
    local existing_theme=$(jq -r ".\"$project_dir\" // empty" "$theme_map")
    
    if [ -n "$existing_theme" ]; then
        echo "📁 Current project theme: $existing_theme"
        read -p "Change theme for this project? (y/n): " change
        if [[ ! "$change" =~ ^[Yy]$ ]]; then
            set_theme "$existing_theme"
            return
        fi
    fi
    
    echo "Select theme for project: $project_name"
    select_theme
    
    # Save project theme mapping
    local selected="${ALL_THEMES[$((selection-1))]}"
    jq ". + {\"$project_dir\": \"$selected\"}" "$theme_map" > "$theme_map.tmp" && mv "$theme_map.tmp" "$theme_map"
    echo "✓ Saved theme preference for project: $project_name"
}

rotate_themes() {
    local interval="${1:-300}"  # Default 5 minutes
    echo "🔄 Starting theme rotation (every ${interval}s)"
    echo "   Press Ctrl+C to stop"
    
    while true; do
        random_theme
        sleep "$interval"
    done
}

show_help() {
    cat << EOF
Dragon Ball Zed Theme Manager
Usage: $0 [command] [options]

Commands:
  random              Set a random Dragon Ball theme
  select              Show interactive theme selector
  project             Set/remember theme for current project
  rotate [seconds]    Continuously rotate themes (default: 300s)
  help                Show this help message

Examples:
  $0 random                    # Set random theme
  $0 select                    # Interactive selection
  $0 project                   # Set theme for current project
  $0 rotate 600               # Rotate every 10 minutes

EOF
}

# Main
case "${1:-select}" in
    random)
        random_theme
        ;;
    select)
        select_theme
        ;;
    project)
        project_theme
        ;;
    rotate)
        rotate_themes "${2:-300}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        show_help
        exit 1
        ;;
esac
