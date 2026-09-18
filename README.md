# Dragon Ball VS Code Themes

A collection of professional, high-contrast Visual Studio Code themes inspired by Dragon Ball! Each theme features **One Dark-style rich syntax highlighting** with 50+ scope rules, character-specific accent colors, and excellent readability for modern development.

## ✨ New: Enhanced Color Palettes

All themes have been upgraded with:
- **Rich syntax highlighting** (50+ language scopes)
- **Professional contrast** inspired by One Dark theme
- **Multiple color tiers** for better code differentiation
- **Expanded language support** (Go, TypeScript, Python, Terraform, YAML, JSON, Makefile, and more)
- **Special highlighting** for operators, parameters, decorators, and annotations
- **Zed editor compatible** (see [ZED_THEMES.md on GitHub](https://github.com/felipe-rochac/vscode-theme-dragonball/blob/main/ZED_THEMES.md))

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
See [ZED_THEMES.md on GitHub](https://github.com/felipe-rochac/vscode-theme-dragonball/blob/main/ZED_THEMES.md) for instructions on using these themes in Zed editor.

## New in 2.2.1: Workspace and Agent Colors

Distinguish workspace windows with an explicit accent color, similar to Peacock. Disabled by
default; nothing is written until you run the configure command.

- `Dragon Ball: Configure Workspace Colors` — choose a custom `#RRGGBB`/`#RGB` hex color or one
  of the 15 included Dragon Ball theme presets. The selected hue is softened for comfortable
  window chrome, with optional status and activity bars plus recommended darker
  **Sidebars / Copilot Chat**, **Agent Chat / Editor**, and **Panels / Terminal** surfaces. The recommended surfaces are
  preselected in the surface picker; status and activity bars start unchecked. Nothing is applied
  until you confirm the picker, and Escape cancels without writes. **Agent Chat / Editor** colors
  editor-hosted Agent Chat, chat requests, and inline chat. Because VS Code has no dedicated Agent
  Chat canvas color, this option also colors normal editor backgrounds in that workspace; uncheck
  it to preserve the syntax theme's editor canvas. Terminal ANSI colors remain controlled by the
  active syntax theme. The title bar is always included.
- `Dragon Ball: Disable Workspace Colors` — restores only the keys this extension owns to their
  original workspace value (or removes them if they didn't exist before), leaving any unrelated
  or externally edited settings untouched.

Writes always target workspace-level settings (`ConfigurationTarget.Workspace`) — never your user
/global settings, and never the theme JSON or `workbench.colorTheme` itself. Run
**Disable Workspace Colors** before uninstalling the extension; workspace settings persist after
uninstall, and uninstall hooks are not a reliable way to restore them.

A `$(paintcan)` status-bar item is registered after startup and opens the configure command
directly; it appears in every window (including ones where configuring is refused, e.g. an empty
or unsaved multi-root workspace) and is not shown if you've hidden the status bar or an individual
item, or in Zen Mode — the Command Palette commands above remain available as a fallback either
way.

**Known limitations:**
- VS Code's configuration API offers no atomic compare-and-swap or writer attribution, so a
  conflicting external write between this extension's read and its settings update is possible in
  principle; preflight checks, event tracking, and a read-back after every write reduce this risk
  but do not eliminate it against an arbitrary concurrent writer.
- Nothing is written automatically: installation, startup, and opening/reloading a workspace never
  change settings on their own — only an explicit configure command does.
- Run **Disable Workspace Colors** before uninstalling; workspace settings persist after uninstall
  and uninstall hooks are not a reliable way to restore them.
- Native OS title bars may ignore `workbench` title colors. VS Code typically renders these
  accents in its custom title bar. This extension never changes `window.titleBarStyle` automatically.

## Packaging & Distribution
Use Node.js 22 LTS and the lockfile-pinned repository tooling. From the repository root, build
and package version 2.2.1 (including Agent Chat colors) for local testing and release:
```bash
npm ci
npm run build
npm run package:local
npm run verify:vsix
```
The archive filename follows the manifest version, currently
`artifacts/vscode-theme-dragonball-2.2.1-workspace-colors.vsix`.

### Publishing 2.2.1

After automated checks, isolated installation/UI checks, and independent review pass, manually
publish the exact validated archive with the repository-local VSCE version:

```bash
npx --no-install vsce publish --packagePath "artifacts/vscode-theme-dragonball-2.2.1-workspace-colors.vsix"
```

Publishing requires a Visual Studio Marketplace personal access token and is intentionally not
performed by the local packaging command. This command uses the archive's existing version; it
does not request a version bump, rebuild, commit, or tag. Do not put credentials in this README
or command history.

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

### v2.2.1 - Agent Chat Colors
- Added an Agent Chat / Editor surface for editor-hosted Copilot Agent sessions and inline chat
- Added hue-matched chat request, bubble, slash-command, and avatar colors
- Restores the original editor and chat colors when the surface is deselected or Workspace Colors is disabled
- Selecting this surface also colors normal editor backgrounds because VS Code shares that canvas color

### v2.2.0 - Workspace Colors
- Added Peacock-style workspace window accents with custom hex colors
- Added presets matching all 15 included Dragon Ball themes
- Added quick access from the status-bar paint-can item
- Always includes the title bar, with optional status bar, activity bar, sidebar/Copilot Chat, and panel/terminal surfaces
- Preselects sidebar/chat and panel/terminal in the picker; status and activity bars start unchecked
- Added safe conflict detection, ownership tracking, and restoration of previous workspace colors
- Preserved syntax-theme editor colors and terminal ANSI colors

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
