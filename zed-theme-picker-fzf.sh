#!/bin/bash
# Dragon Ball Theme Picker with FZF (fuzzy finder)
# Requires: fzf (install with: sudo apt install fzf)

ZED_SETTINGS="$HOME/.config/zed/settings.json"

# All themes
THEMES=$(cat << 'EOF'
Dragon Ball Goku
Dragon Ball Goku (Darker)
Dragon Ball Goku (Lighter)
Dragon Ball Vegeta
Dragon Ball Vegeta (Darker)
Dragon Ball Vegeta (Lighter)
Dragon Ball Gohan
Dragon Ball Gohan (Darker)
Dragon Ball Gohan (Lighter)
Dragon Ball Piccolo
Dragon Ball Piccolo (Darker)
Dragon Ball Piccolo (Lighter)
Dragon Ball Frieza
Dragon Ball Frieza (Darker)
Dragon Ball Frieza (Lighter)
Dragon Ball Cell
Dragon Ball Cell (Darker)
Dragon Ball Cell (Lighter)
Dragon Ball Majin Buu
Dragon Ball Majin Buu (Darker)
Dragon Ball Majin Buu (Lighter)
Dragon Ball Broly
Dragon Ball Broly (Darker)
Dragon Ball Broly (Lighter)
Dragon Ball Trunks
Dragon Ball Trunks (Darker)
Dragon Ball Trunks (Lighter)
Dragon Ball Beerus
Dragon Ball Beerus (Darker)
Dragon Ball Beerus (Lighter)
Dragon Ball Jiren
Dragon Ball Jiren (Darker)
Dragon Ball Jiren (Lighter)
Dragon Ball Android 18
Dragon Ball Android 18 (Darker)
Dragon Ball Android 18 (Lighter)
Dragon Ball Super Saiyan 4
Dragon Ball Super Saiyan 4 (Darker)
Dragon Ball Super Saiyan 4 (Lighter)
Dragon Ball Super Saiyan Blue
Dragon Ball Super Saiyan Blue (Darker)
Dragon Ball Super Saiyan Blue (Lighter)
Dragon Ball Dragon Ball
Dragon Ball Dragon Ball (Darker)
Dragon Ball Dragon Ball (Lighter)
EOF
)

set_theme() {
    local theme="$1"
    
    # Check if fzf is installed
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed. Install with: sudo apt install fzf"
        exit 1
    fi
    
    # Backup settings
    cp "$ZED_SETTINGS" "$ZED_SETTINGS.bak" 2>/dev/null || true
    
    # Update theme in settings.json
    if grep -q '"theme":' "$ZED_SETTINGS" 2>/dev/null; then
        sed -i "s/\"theme\": \".*\"/\"theme\": \"$theme\"/" "$ZED_SETTINGS"
    else
        # Create settings if doesn't exist
        if [ ! -f "$ZED_SETTINGS" ]; then
            mkdir -p "$(dirname "$ZED_SETTINGS")"
            echo '{"theme": "'"$theme"'"}' > "$ZED_SETTINGS"
        else
            sed -i 's/{/{\n  "theme": "'"$theme"'",/' "$ZED_SETTINGS"
        fi
    fi
    
    echo "✓ Theme set to: $theme"
}

# Get current theme
current_theme=$(grep '"theme":' "$ZED_SETTINGS" 2>/dev/null | sed 's/.*"theme": "\(.*\)".*/\1/')

# Use fzf to select theme
selected=$(echo "$THEMES" | fzf \
    --height=20 \
    --border \
    --prompt="🐉 Select Dragon Ball Theme: " \
    --header="Current: $current_theme" \
    --preview-window=right:30% \
    --preview='echo "Theme Preview:
━━━━━━━━━━━━━━━
{}
━━━━━━━━━━━━━━━

Characters:
🥋 Goku - Orange/Gold
👑 Vegeta - Royal Blue  
⚡ Gohan - Purple/Blue
🟢 Piccolo - Green
👾 Frieza - Purple/Pink
🔬 Cell - Bio Green
🍬 Majin Buu - Pink
💚 Broly - Bright Green
⚔️  Trunks - Blue/Purple
😼 Beerus - Deep Purple
💪 Jiren - Red
🤖 Android 18 - Cool Blue
🌟 Super Saiyan 4 - Red/Gold
💎 Super Saiyan Blue - Cyan

Variants:
• Base - Original
• Darker - Eye comfort
• Lighter - Bright"' \
)

if [ -n "$selected" ]; then
    set_theme "$selected"
else
    echo "❌ No theme selected"
    exit 1
fi
