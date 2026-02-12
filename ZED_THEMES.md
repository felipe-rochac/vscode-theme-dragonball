# Dragon Ball Themes for Zed Editor

The Dragon Ball VS Code themes can be adapted for use in Zed editor. Here's how to use them:

## Installation Options

### Option 1: Use VS Code Theme Extension in Zed

Zed has built-in support for importing VS Code themes:

1. Open Zed settings: `Cmd/Ctrl + ,`
2. Add the theme import in your `settings.json`:

```json
{
  "theme": {
    "mode": "dark",
    "light": "One Light",
    "dark": "Dragon Ball Piccolo"
  },
  "experimental.theme_overrides": {
    "players": [
      {
        "cursor": "#7FFF00",
        "background": "#7FFF0020",
        "selection": "#7FFF0030"
      }
    ]
  }
}
```

### Option 2: Manual Theme Conversion

Convert VS Code themes to Zed format by creating a theme file in `~/.config/zed/themes/`:

1. Create directory: `mkdir -p ~/.config/zed/themes`
2. Create a JSON file for your theme (e.g., `piccolo.json`)
3. Convert VS Code color scheme to Zed format

## Theme Color Reference

Each Dragon Ball theme now features:

- **Rich syntax highlighting** with 50+ scope rules
- **Professional contrast** inspired by One Dark theme
- **Multiple color tiers** for better code readability
- **Character-specific accent colors** maintained throughout

### Theme Accent Colors

- **Piccolo**: Green (#7FFF00) + Purple (#a98bff)
- **Vegeta**: Royal Blue (#1976D2) + Gold (#FFD700)
- **Goku**: Orange (#F47C2C) + Gold (#FFD700)
- **Trunks**: Cyan (#6BC7FF) + Purple (#A084CA)
- **Frieza**: Plum (#DDA0DD) + Pink (#FF6FD8)
- **Gohan**: Purple (#A084CA) + Gold (#FFD700)
- **Majin Buu**: Pink (#F7768E) + Gold (#FFD700)
- **Broly**: Mint Green (#6BFFB8) + Light Green (#7CFF6B)
- **Beerus**: Purple (#A084CA) + Gold (#FFD700)
- **Android 18**: Cyan (#6BC7FF) + Purple (#A084CA)
- **Cell**: Chartreuse (#7FFF00) + Lime (#32CD32)
- **Jiren**: Red (#FF2D2D) + Gray (#7C7C8C)
- **Super Saiyan Blue**: Sky Blue (#00BFFF) + Cyan (#00FFFF)
- **Super Saiyan 4**: Red (#FF4B4B) + Gold (#FFD700)
- **Dragon Ball**: Orange (#FF9800) + Blue (#1976D2)

## Zed Theme Format Example

Here's a basic Zed theme structure based on Piccolo:

```json
{
  "name": "Dragon Ball Piccolo",
  "author": "Your Name",
  "themes": [
    {
      "name": "Dragon Ball Piccolo",
      "appearance": "dark",
      "style": {
        "background": "#0d1117",
        "foreground": "#e6edf3",
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editor.line_highlight": "#161b22",
        "editor.selection": "#264f78",
        "syntax": {
          "comment": {
            "color": "#6a737d",
            "font_style": "italic"
          },
          "keyword": {
            "color": "#7FFF00",
            "font_weight": 700
          },
          "function": {
            "color": "#a98bff",
            "font_style": "italic"
          },
          "type": {
            "color": "#c3b8ff",
            "font_weight": 700
          },
          "string": {
            "color": "#98d3ff"
          },
          "number": {
            "color": "#79c0ff"
          },
          "variable": {
            "color": "#e6edf3"
          },
          "constant": {
            "color": "#79c0ff",
            "font_weight": 700
          }
        }
      }
    }
  ]
}
```

## Converting Themes

To convert all VS Code themes to Zed format, you can use the conversion script (coming soon) or manually adapt the color schemes using the Zed theme documentation:

https://zed.dev/docs/themes

## Features

All Dragon Ball themes now include:

✅ **50+ Syntax Scopes** - Comprehensive language support
✅ **Better Contrast** - Professional readability like One Dark
✅ **Rich Color Palette** - Multiple accent colors per theme
✅ **Language Support**:
  - Go (advanced TextMate scopes)
  - JavaScript/TypeScript (JSX/TSX)
  - YAML
  - JSON
  - Terraform
  - Makefile
  - Python
  - And more!

✅ **Special Highlighting**:
  - Operators and keywords
  - Function parameters
  - Class names and types
  - Constants and enums
  - String templates and regex
  - Decorators and annotations
  - Import statements

## Tips for Best Experience

1. **Font Recommendations**: Use a ligature-supporting font like:
   - Fira Code
   - JetBrains Mono
   - Cascadia Code

2. **Enable Semantic Highlighting** in your editor for best results

3. **Adjust Contrast**: If needed, modify the background color slightly darker or lighter

4. **Terminal Theme**: Consider matching your terminal theme to your editor theme for consistency

## Troubleshooting

If colors don't appear correctly in Zed:

1. Make sure the theme file is in the correct location
2. Restart Zed after adding new themes
3. Check Zed's theme documentation for the latest format changes
4. Verify JSON syntax is valid

## Contributing

Want to improve the Zed theme conversion or add new features? PRs welcome!
