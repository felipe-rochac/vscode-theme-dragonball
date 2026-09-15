# Changelog

All notable changes to the Dragon Ball VS Code Themes will be documented in this file.

## [2.2.0] - 2026-09-15

### Workspace Colors
- Added opt-in, Peacock-style workspace accents independent of the selected syntax theme.
- Added custom `#RGB` and `#RRGGBB` input plus presets for all 15 included Dragon Ball themes.
- Added a persistent status-bar paint-can launcher and Command Palette configure/disable commands.
- Always includes the title bar, with selectable status bar, activity bar, sidebar/Copilot Chat, and panel/terminal surfaces.
- Preselects sidebar/chat and panel/terminal in the surface picker; status and activity bars start unchecked. Confirmation is required before applying colors, and Escape cancels without writes.
- Softened bright accents for comfortable window chrome while preserving readable foreground contrast.
- Kept the editor canvas and terminal ANSI palette controlled by the active syntax theme.

### Safety and Compatibility
- Writes only to workspace-level `workbench.colorCustomizations`; global settings and theme JSON files are never changed.
- Preserves unrelated color customizations and restores only keys still owned by this extension.
- Detects existing, inherited, theme-specific, and externally changed color overrides before takeover or restoration.
- Handles interrupted writes through explicit recovery instead of automatic destructive restoration.
- Supports folder and saved multi-root workspaces and rejects unsupported empty or untitled workspaces without writes.
- Retains compatibility with VS Code 1.60.0 and current stable releases.

### Tooling and Validation
- Added reproducible local build, lint, unit, Extension Host, packaging, and VSIX archive-validation scripts.
- Added a strict package allowlist containing runtime output, all themes, images, manifest, license, README, and changelog.
- Added focused tests for color contrast, ownership, restoration, cancellation, conflict races, startup activation, and launcher lifecycle.

## [2.0.0] - 2026-02-10

### Major Enhancements ✨

#### Professional Color Palettes
- **Rich Syntax Highlighting**: Expanded from basic syntax to 50+ scope rules
- **One Dark Inspiration**: Professional contrast and readability inspired by the popular One Dark theme
- **Multiple Color Tiers**: Each theme now uses primary, secondary, and tertiary accent colors for better code differentiation
- **Improved Contrast**: Enhanced readability with optimized foreground/background contrast ratios

#### Expanded Language Support
- **Go (golang)**: Advanced TextMate scopes with full import/package highlighting
- **JavaScript/TypeScript**: Complete JSX/TSX support with detailed property and method highlighting
- **Python**: Decorators, magic methods, type annotations
- **YAML**: Tags, anchors, aliases, and multi-line values
- **JSON**: Schema support with keys and values
- **Terraform**: Resources, variables, functions, data sources, and blocks
- **Makefile**: Targets, prerequisites, variables, and recipes
- **Additional**: CSS, SCSS, HTML, Markdown, XML, and more

#### New Syntax Elements
- Comments (single-line, multi-line, documentation)
- Keywords (control flow, operators, expressions)
- Storage types and modifiers
- Function and method names
- Variables and parameters (with distinct parameter coloring)
- Strings (quoted, template, regexp)
- Numbers and constants (with bold styling)
- Properties and attributes
- Decorators and annotations
- Punctuation (strings, separators, blocks)
- Import statements and modules
- Classes and interfaces
- Operators and logical expressions

#### Theme Improvements
Each of the 15 themes now features:
- ✅ Professional-grade syntax highlighting
- ✅ Better visual hierarchy with multiple accent colors
- ✅ Consistent color application across all language features
- ✅ Optimized for long coding sessions
- ✅ Character-specific personality maintained

### Zed Editor Support 🎨
- Added Zed editor compatibility documentation
- Created [ZED_THEMES.md](ZED_THEMES.md) with conversion guide
- Provided Zed theme structure examples
- Included color reference for all themes

### Documentation Updates 📚
- Updated README with comprehensive feature list
- Added recommended editor settings
- Created detailed changelog
- Added theme color reference guide
- Improved installation instructions

### Technical Changes 🔧
- Removed JSONC comments from theme files for better compatibility
- Standardized theme structure across all 15 themes
- Automated theme enhancement with Python script
- Optimized color hex values for consistency

### Themes Updated
All 15 themes received the full enhancement treatment:
1. Piccolo
2. Vegeta
3. Goku
4. Trunks
5. Frieza
6. Gohan
7. Majin Buu
8. Broly
9. Beerus
10. Android 18
11. Cell
12. Jiren
13. Super Saiyan Blue
14. Super Saiyan 4
15. Dragon Ball (classic)

## [1.0.2] - Previous Release

### Features
- Basic character-themed color palettes
- GitHub Dark UI base
- Go syntax highlighting
- YAML, JSON, JS/TS support
- Makefile highlighting
- 15 character themes

## Future Plans 🚀

- [ ] Automated Zed theme converter
- [ ] Light theme variants
- [ ] Additional character themes (Hit, Whis, etc.)
- [ ] Theme customization API
- [ ] VS Code marketplace publication
- [ ] Community theme submissions

---

**Note**: This is a major version update (1.x → 2.0) due to significant enhancements in syntax highlighting and overall theme quality. All themes remain backward compatible with VS Code 1.60.0+.
