# Dragon Ball Zed Themes

All 15 Dragon Ball themes converted for Zed editor with **3 background variants each** (45 total themes).

## Background Variants

Each theme comes in 3 variants:

- **Base** (e.g., `Dragon Ball Goku`) - Original background from VS Code theme
- **Darker** (e.g., `Dragon Ball Goku (Darker)`) - 15% darker background for reduced eye strain
- **Lighter** (e.g., `Dragon Ball Goku (Lighter)`) - 15% lighter background for brighter environments

## Installation

```bash
# Copy all themes
cp zed-themes/*.json ~/.config/zed/themes/

# Or copy specific theme
cp zed-themes/goku.json ~/.config/zed/themes/
```

Then restart Zed and select from the theme picker.

## Dynamic Theme Switching

### 🎯 Interactive Theme Picker (Recommended)

**With FZF (fuzzy finder):**
```bash
# Install fzf first
sudo apt install fzf

# Run the picker
./zed-theme-picker-fzf.sh
```

Features:
- 🔍 Fuzzy search through all themes
- 👁️ Live preview of theme info
- ⚡ Fast keyboard navigation
- 📋 Shows current theme

**Classic Menu:**
```bash
./zed-theme-manager.sh select
```

### 🎲 Random Theme

```bash
# Set random theme instantly
./zed-theme-manager.sh random
```

### 🔄 Auto-Rotate Themes

```bash
# Rotate every 5 minutes (default)
./zed-theme-manager.sh rotate

# Rotate every 10 minutes
./zed-theme-manager.sh rotate 600

# Rotate every hour
./zed-theme-manager.sh rotate 3600
```

### 📁 Per-Project Themes

Set and remember themes for specific projects:

```bash
# In your project directory
cd ~/my-project
./zed-theme-manager.sh project

# Next time you work on this project, run:
./zed-theme-manager.sh project
# It will remember and apply your saved theme!
```

### ⏰ Time-Based Auto-Switching

Automatically change themes based on time of day:

```bash
# Add to crontab to run every hour
crontab -e

# Add this line:
0 * * * * /path/to/zed-auto-theme-switcher.sh time
```

Schedule:
- **6am-9am**: Lighter themes (morning)
- **9am-5pm**: Base themes (work hours)
- **5pm-9pm**: Base/standard (evening)
- **9pm-6am**: Darker themes (night)

### 🚀 Quick Setup

**Option 1: Add to shell aliases**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias zth='~/path/to/zed-theme-picker-fzf.sh'
alias ztr='~/path/to/zed-theme-manager.sh random'

# Then use:
# zth  - Open theme picker
# ztr  - Random theme
```

**Option 2: Install system-wide**
```bash
sudo cp zed-theme-manager.sh /usr/local/bin/zed-theme
sudo cp zed-theme-picker-fzf.sh /usr/local/bin/zed-theme-fzf

# Then use anywhere:
zed-theme random
zed-theme-fzf
```

**Option 3: Keyboard shortcut**
```bash
# Add to your window manager or desktop environment
# Example for GNOME:
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
  "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/']"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/ \
  name 'Zed Theme Picker'

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/ \
  command '/path/to/zed-theme-picker-fzf.sh'

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/ \
  binding '<Super>t'
# Now press Super+T to open theme picker!
```

## Regenerating Themes

To regenerate with different options:

```bash
# Default only
echo "default" | python3 convert_to_zed.py

# Only darker variants
echo "darker" | python3 convert_to_zed.py

# Only lighter variants
echo "lighter" | python3 convert_to_zed.py

# All variants (base + darker + lighter)
echo "all" | python3 convert_to_zed.py

# Then copy to Zed
cp zed-themes/*.json ~/.config/zed/themes/
```

## Color Distinctions

The themes properly distinguish:

### Go
- **Variables**: default text color
- **Packages/Imports**: brown, bold (using `namespace`, `module`, `label`)
- **Import paths**: orange, bold
- **Functions**: gold, italic
- **Types**: orange, bold
- **Strings**: blue
- **Numbers**: blue or deep blue (theme-dependent)

### JavaScript/TypeScript
- **Object keys**: gold, bold
- **String values**: blue
- **Numbers**: blue
- **Booleans**: gold, bold
- **Brackets**: orange or gold (theme-dependent)

### Bash/Shell
- **Variables**: default text color
- **Variable punctuation** (`${}`) : gold - distinct from variable names!
- **Strings**: blue
- **Keywords**: orange, bold
- **Builtins**: gold, italic

### Terraform
- **Variables**: default text color
- **Functions**: gold, italic
- **Types**: orange, bold
- **Strings**: blue
- **Numbers**: blue

### YAML
- **Keys**: gold, bold
- **Quoted strings**: blue
- **Unquoted values**: deep blue
- **Numbers**: blue
- **Anchors/Aliases**: blue/gold, bold

## About Animations

**Note**: Zed theme files are static JSON configurations and do not support animations. 

However, you can create visual effects by:

1. **Switching themes** - Create a script to rotate through different Dragon Ball themes
2. **Custom Zed extensions** - Write a Zed extension that changes themes programmatically
3. **External tools** - Use system-level tools to change themes based on time of day

Example theme rotation script:

```bash
#!/bin/bash
# Save as ~/.local/bin/zed-theme-cycle.sh

THEMES=(
  "Dragon Ball Goku"
  "Dragon Ball Vegeta"
  "Dragon Ball Super Saiyan Blue"
  "Dragon Ball Frieza"
)

# Read current theme from Zed settings
# This is a simplified example
for theme in "${THEMES[@]}"; do
  echo "Switching to $theme"
  # Update Zed settings.json with new theme
  sleep 300  # 5 minutes
done
```

For true animations, you would need:
- Terminal emulator animations (if using Zed in terminal)
- Window manager effects
- Or contribute to Zed to add animation support

## Available Themes

1. Android 18
2. Beerus
3. Broly
4. Cell
5. Dragon Ball
6. Frieza
7. Gohan
8. Goku
9. Jiren
10. Majin Buu
11. Piccolo
12. Super Saiyan 4
13. Super Saiyan Blue
14. Trunks
15. Vegeta

Each with Base, Darker, and Lighter variants = **45 themes total**!
