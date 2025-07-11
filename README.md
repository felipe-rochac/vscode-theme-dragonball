# Dragon Ball VS Code Themes

A collection of dark, character-accurate Visual Studio Code themes inspired by Dragon Ball! Each theme is carefully crafted to match the palette and spirit of a specific character, with advanced syntax highlighting (including Go/golang), Dracula-style UI coverage, and unique touches for each hero and villain.

## Included Themes
- Goku
- Vegeta
- Gohan
- Frieza
- Majin Buu
- Broly
- Beerus
- Dragon Ball (classic)
- Super Saiyan Blue
- Trunks
- Android 18
- Cell
- Piccolo
- Jiren (ultra-dark, red/gray)
- Super Saiyan 4 (deep red, gold, brown)

## Features
- **Character-accurate palettes**: Each theme uses colors inspired by the character's design.
- **Dracula-style UI coverage**: Activity bar, status bar, side bar, title bar, tabs, panels, and more.
- **Advanced Go (golang) syntax highlighting**:
  - `entity.name.import.go`: Imported package name
  - `variable.other.package.go`: Package references in code (e.g., `uuid` in `uuid.New()`), bold and colored
  - `entity.name.import.path.go`: Last part of import path (e.g., `uuid` in `github.com/google/uuid`), bold, colored, and underlined
- **Consistent, modern look**: All themes are visually balanced and easy on the eyes.
- **Ultra-dark options**: Piccolo, Cell, Jiren, and Super Saiyan 4 are especially suited for dark environments.

## Installation
1. Clone or download this repository.
2. Open the folder in VS Code.
3. Press `F5` to launch the Extension Development Host.
4. Use `Ctrl+K Ctrl+T` to switch between the Dragon Ball themes.

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