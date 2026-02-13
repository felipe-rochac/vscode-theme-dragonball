# Dragon Ball VS Code Themes

A collection of professional, high-contrast Visual Studio Code themes inspired by Dragon Ball! Each theme features **One Dark-style rich syntax highlighting** with 50+ scope rules, character-specific accent colors, and excellent readability for modern development.

## ✨ New: Enhanced Color Palettes

All themes have been upgraded with:
- **Rich syntax highlighting** (50+ language scopes)
- **Professional contrast** inspired by One Dark theme
- **Multiple color tiers** for better code differentiation
- **Expanded language support** (Go, TypeScript, Python, Terraform, YAML, JSON, Makefile, and more)
- **Special highlighting** for operators, parameters, decorators, and annotations
- **Zed editor compatible** (see [ZED_THEMES.md](ZED_THEMES.md))

## Included Themes

Each theme maintains its character-specific personality while providing professional-grade syntax highlighting:

- **Piccolo** - Green (#7FFF00) + Purple (#a98bff)
- **Vegeta** - Royal Blue (#1976D2) + Gold (#FFD700)
- **Goku** - Orange (#F47C2C) + Gold (#FFD700)
- **Trunks** - Cyan (#6BC7FF) + Purple (#A084CA)
- **Frieza** - Plum (#DDA0DD) + Pink (#FF6FD8)
- **Gohan** - Purple (#A084CA) + Gold (#FFD700)
- **Majin Buu** - Pink (#F7768E) + Gold (#FFD700)
- **Broly** - Mint Green (#6BFFB8) + Light Green (#7CFF6B)
- **Beerus** - Purple (#A084CA) + Gold (#FFD700)
- **Android 18** - Cyan (#6BC7FF) + Purple (#A084CA)
- **Cell** - Chartreuse (#7FFF00) + Lime (#32CD32)
- **Jiren** - Red (#FF2D2D) + Gray (#7C7C8C)
- **Super Saiyan Blue** - Sky Blue (#00BFFF) + Cyan (#00FFFF)
- **Super Saiyan 4** - Red (#FF4B4B) + Gold (#FFD700)
- **Dragon Ball** - Orange (#FF9800) + Blue (#1976D2)

## Features

### Comprehensive Syntax Highlighting
- **Comments**: Subtle gray with italic styling
- **Keywords**: Bold, character-specific accent color
- **Functions**: Italic, tertiary accent color
- **Types & Classes**: Bold, secondary accent color
- **Variables**: Clear white/light gray
- **Parameters**: Distinct orange highlighting
- **Strings**: Soft blue for readability
- **Numbers & Constants**: Bold, accent-colored
- **Operators**: Character-specific primary color
- **Decorators**: Italic, accent-colored

### Language Support
- **Go (golang)**: Advanced TextMate scopes including imports, packages, types, and more
- **JavaScript/TypeScript**: Full JSX/TSX support with detailed property highlighting
- **Python**: Decorators, magic methods, type hints
- **YAML**: Tags, anchors, aliases, and values
- **JSON**: Keys, values, and schema support
- **Terraform**: Resources, variables, functions, and blocks
- **Makefile**: Targets, prerequisites, variables
- **And many more languages...**

### GitHub Dark-Inspired UI
- Activity bar with character-specific accents
- Clean status bar and sidebar
- Distinct tab highlighting
- Professional panel borders
- Optimized for dark environments


## Installation

### From Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Dragon Ball Themes"
4. Click Install
5. Use `Ctrl+K Ctrl+T` to select your favorite Dragon Ball theme

### From Source
1. Clone or download this repository
2. Open the folder in VS Code
3. Press `F5` to launch the Extension Development Host
4. Use `Ctrl+K Ctrl+T` to switch between themes

### For Zed Editor
See [ZED_THEMES.md](ZED_THEMES.md) for instructions on using these themes in Zed editor.

## Packaging & Distribution
To package the theme for distribution:
```bash
npm install -g @vscode/vsce
npx vsce package
```
This will generate a `.vsix` file you can install or share.

### How to install a `.vsix` file
1. Open VS Code
2. Press `Ctrl+Shift+P` and select `Extensions: Install from VSIX...`
3. Choose your `.vsix` file

## Recommended Settings

For the best experience with these themes:

```json
{
  "editor.fontFamily": "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
  "editor.fontLigatures": true,
  "editor.semanticHighlighting.enabled": true,
  "editor.bracketPairColorization.enabled": true
}
```

## Screenshots

Each theme provides:
- ✅ Professional contrast and readability
- ✅ Character-specific accent colors
- ✅ Rich syntax highlighting for 20+ languages
- ✅ Consistent UI design across all themes

## Changelog

### v2.0.0 - Enhanced Color Palettes
- Added One Dark-style rich syntax highlighting
- Expanded to 50+ syntax scopes
- Improved contrast and readability
- Added Zed editor compatibility
- Enhanced language support (Terraform, YAML, Makefile, etc.)

## Repository
[GitHub Repository](https://github.com/felipe-rochac/vscode-theme-dragonball)

## Credits
Inspired by Dragon Ball, created by Akira Toriyama. Theme design and code by Felipe Rocha Correa.

---
Enjoy powering up your coding with Dragon Ball energy!

## 💖 Support My Work

Developing and maintaining this VS Code extension takes time and effort. If you find it useful and would like to support its continued development, please consider making a small donation. Your generosity helps immensely!

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?business=BJ8V7HA6L9KRG&no_recurring=0&item_name=Developing+and+maintaining+extensions+takes+time+and+effort%2C+please+consider+supporting+development+through+a+small+donation.&currency_code=CAD)

Alternatively, you can click here to [Donate directly via PayPal](https://www.paypal.com/donate/?business=BJ8V7HA6L9KRG&no_recurring=0&item_name=Developing+and+maintaining+extensions+takes+time+and+effort%2C+please+consider+supporting+development+through+a+small+donation.&currency_code=CAD)
