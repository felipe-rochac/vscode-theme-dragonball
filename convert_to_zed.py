#!/usr/bin/env python3
"""
Convert VS Code Dragon Ball themes to Zed editor format.
"""

import json
import os
from pathlib import Path
from collections import OrderedDict


def hex_to_rgb(hex_color):
    """Convert hex color to RGB with optional alpha."""
    hex_color = hex_color.lstrip('#')
    
    # Handle 8-digit hex (RGBA)
    if len(hex_color) == 8:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = int(hex_color[6:8], 16) / 255.0
        return f"#{hex_color[0:6]}{int(a * 100):02x}"
    
    # Standard 6-digit hex
    return f"#{hex_color}"


def create_theme_variant(base_theme, variant_name, bg_adjustment):
    """Create a theme variant with adjusted background."""
    import copy
    variant = copy.deepcopy(base_theme)
    
    # Update the theme name
    variant["name"] = f"{base_theme['name']} ({variant_name})"
    variant["themes"][0]["name"] = f"{base_theme['name']} ({variant_name})"
    
    # Adjust background colors
    style = variant["themes"][0]["style"]
    
    def adjust_brightness(hex_color, percent):
        """Adjust brightness of a hex color by percentage."""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 8:
            hex_color = hex_color[:6]  # Remove alpha
        
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        
        # Adjust brightness
        r = min(255, max(0, int(r * (1 + percent))))
        g = min(255, max(0, int(g * (1 + percent))))
        b = min(255, max(0, int(b * (1 + percent))))
        
        return f"#{r:02x}{g:02x}{b:02x}"
    
    # Adjust background-related colors
    bg_keys = [
        "background", "editor.gutter.background", 
        "toolbar.background", "tab_bar.background",
        "panel.background", "status_bar.background",
        "title_bar.background", "editor.line_highlight_background",
        "editor.active_line_background", "tab.inactive_background"
    ]
    
    for key in bg_keys:
        if key in style:
            style[key] = adjust_brightness(style[key], bg_adjustment)
    
    # Slightly adjust tab active background too
    if "tab.active_background" in style:
        style["tab.active_background"] = adjust_brightness(style["tab.active_background"], bg_adjustment * 0.5)
    
    return variant


def create_dark_variant(base_theme, variant_name, bg_level="base"):
    """Create variant with neutral dark background (One Dark style) but keep syntax colors."""
    import copy
    variant = copy.deepcopy(base_theme)
    
    # Update the theme name
    variant["name"] = f"{base_theme['name']} ({variant_name})"
    variant["themes"][0]["name"] = f"{base_theme['name']} ({variant_name})"
    
    # Replace with neutral One Dark-style backgrounds
    style = variant["themes"][0]["style"]
    
    # One Dark Pro background palette
    dark_backgrounds = {
        "darker": {
            "editor": "#1a1d23",
            "sidebar": "#1e2127", 
            "panel": "#21252b",
            "active": "#2c313a",
            "highlight": "#2c313c",
        },
        "base": {
            "editor": "#282c34",
            "sidebar": "#21252b",
            "panel": "#282c34", 
            "active": "#2c313c",
            "highlight": "#2c313c",
        },
        "lighter": {
            "editor": "#2c313a",
            "sidebar": "#282c34",
            "panel": "#2c313a",
            "active": "#3e4451",
            "highlight": "#3e4451",
        }
    }
    
    bg = dark_backgrounds.get(bg_level, dark_backgrounds["base"])
    
    # Apply neutral dark backgrounds
    style["background"] = bg["editor"]
    style["editor.background"] = bg["editor"]
    style["editor.gutter.background"] = bg["editor"]
    style["toolbar.background"] = bg["sidebar"]
    style["tab_bar.background"] = bg["sidebar"]
    style["status_bar.background"] = bg["sidebar"]
    style["title_bar.background"] = bg["sidebar"]
    style["panel.background"] = bg["panel"]
    style["tab.active_background"] = bg["active"]
    style["tab.inactive_background"] = bg["sidebar"]
    style["editor.line_highlight_background"] = bg["highlight"]
    style["editor.active_line_background"] = bg["highlight"]
    
    # Keep character-specific borders and accents
    # (these are already set from base theme)
    
    return variant


def add_thematic_background(colors, theme_name):
    """Add character-specific thematic tint to backgrounds with improved contrast."""
    
    # Define character-specific color tints with better contrast (inspired by One Dark)
    theme_tints = {
        "Goku": {
            "base": "#1e1a14",           # Warmer, deeper
            "sidebar": "#252018",         
            "highlight": "#2d2620",
            "active": "#3a3128",
            "panel": "#23201a",
            "border": "#FFD700",
            "accent": "#F47C2C"
        },
        "Vegeta": {
            "base": "#161b26",           # Deeper blue
            "sidebar": "#1a2030",
            "highlight": "#1f2638",
            "active": "#2a3548",
            "panel": "#1c2230",
            "border": "#1976D2",
            "accent": "#1976D2"
        },
        "Gohan": {
            "base": "#1a1826",           # Purple-blue
            "sidebar": "#1e1c2e",
            "highlight": "#252336",
            "active": "#2f2d44",
            "panel": "#211f30",
            "border": "#9B72FF",
            "accent": "#8B5CF6"
        },
        "Piccolo": {
            "base": "#15201a",           # Deep green
            "sidebar": "#18261f",
            "highlight": "#1d2e26",
            "active": "#263a30",
            "panel": "#1a2822",
            "border": "#4ADE80",
            "accent": "#10B981"
        },
        "Frieza": {
            "base": "#221828",           # Purple/magenta
            "sidebar": "#281d2e",
            "highlight": "#2f2436",
            "active": "#3d3044",
            "panel": "#2a2030",
            "border": "#FF6FD8",
            "accent": "#E879F9"
        },
        "Cell": {
            "base": "#1a231a",           # Bio green
            "sidebar": "#1d281d",
            "highlight": "#243024",
            "active": "#2e3c2e",
            "panel": "#202a20",
            "border": "#86EFAC",
            "accent": "#34D399"
        },
        "Majin Buu": {
            "base": "#261a22",           # Pink
            "sidebar": "#2d1f28",
            "highlight": "#352630",
            "active": "#43323e",
            "panel": "#2f2229",
            "border": "#F472B6",
            "accent": "#EC4899"
        },
        "Broly": {
            "base": "#182818",           # Bright green
            "sidebar": "#1c2e1c",
            "highlight": "#223822",
            "active": "#2a442a",
            "panel": "#1e301e",
            "border": "#4ADE80",
            "accent": "#22C55E"
        },
        "Trunks": {
            "base": "#1a1a28",           # Blue/purple
            "sidebar": "#1e1e30",
            "highlight": "#252538",
            "active": "#303046",
            "panel": "#212132",
            "border": "#818CF8",
            "accent": "#6366F1"
        },
        "Beerus": {
            "base": "#221a28",           # Deep purple
            "sidebar": "#281e30",
            "highlight": "#2f2538",
            "active": "#3d3146",
            "panel": "#2a2232",
            "border": "#A78BFA",
            "accent": "#8B5CF6"
        },
        "Jiren": {
            "base": "#281a1a",           # Red
            "sidebar": "#301e1e",
            "highlight": "#382525",
            "active": "#463030",
            "panel": "#322020",
            "border": "#F87171",
            "accent": "#EF4444"
        },
        "Android 18": {
            "base": "#1a2228",           # Cool blue
            "sidebar": "#1e2830",
            "highlight": "#253038",
            "active": "#303c46",
            "panel": "#212a32",
            "border": "#38BDF8",
            "accent": "#0EA5E9"
        },
        "Super Saiyan": {
            "base": "#28241a",           # Golden
            "sidebar": "#2e2a1e",
            "highlight": "#383225",
            "active": "#463e30",
            "panel": "#322c22",
            "border": "#FBBF24",
            "accent": "#F59E0B"
        },
        "Dragon Ball": {
            "base": "#241e18",           # Orange
            "sidebar": "#2a241c",
            "highlight": "#322c24",
            "active": "#403830",
            "panel": "#2c2820",
            "border": "#FB923C",
            "accent": "#F97316"
        },
    }
    
    # Find matching theme
    tint_info = None
    for key, value in theme_tints.items():
        if key in theme_name:
            tint_info = value
            break
    
    # Apply enhanced thematic backgrounds
    if tint_info:
        # Main editor - darkest for best contrast
        colors["background"] = tint_info["base"]
        colors["editor.background"] = tint_info["base"]
        colors["editor.gutter.background"] = tint_info["base"]
        
        # UI elements - slightly lighter
        colors["toolbar.background"] = tint_info["sidebar"]
        colors["tab_bar.background"] = tint_info["sidebar"]
        colors["status_bar.background"] = tint_info["sidebar"]
        colors["title_bar.background"] = tint_info["sidebar"]
        
        # Panel - balanced
        colors["panel.background"] = tint_info["panel"]
        
        # Active elements - more visible
        colors["tab.active_background"] = tint_info["active"]
        colors["tab.inactive_background"] = tint_info["sidebar"]
        
        # Highlighting - subtle but visible
        colors["editor.line_highlight_background"] = tint_info["highlight"]
        colors["editor.active_line_background"] = tint_info["highlight"]
        
        # Selection - use accent with opacity for better visibility
        colors["selection"] = tint_info["accent"] + "40"  # 25% opacity
        
        # Borders - themed accent color
        colors["border"] = tint_info["border"]
        colors["border.variant"] = tint_info["highlight"]
        colors["border.focused"] = tint_info["accent"]
    
    return colors


def convert_vscode_to_zed(vscode_theme, theme_name):
    """Convert a VS Code theme to Zed theme format."""
    
    colors = vscode_theme.get("colors", {})
    token_colors = vscode_theme.get("tokenColors", [])
    
    # Collect all distinct colors used in the theme
    color_map = OrderedDict()
    
    # Process tokens to extract all unique color assignments
    for token in token_colors:
        if not isinstance(token, dict):
            continue
            
        scopes = token.get("scope", [])
        if isinstance(scopes, str):
            scopes = [scopes]
        
        settings = token.get("settings", {})
        color = settings.get("foreground")
        font_style = settings.get("fontStyle", "")
        
        if not color:
            continue
        
        # Store each scope with its color and style
        for scope in scopes:
            color_map[scope] = {"color": color, "font_style": font_style}
    
    # Add bash/shell specific scopes based on existing theme colors
    # Use keyword color for shell keywords if not already defined
    if "keyword" in color_map or "keyword.control" in color_map:
        keyword_info = color_map.get("keyword.control", color_map.get("keyword", {}))
        if keyword_info:
            color_map["keyword.control.shell"] = keyword_info
            color_map["keyword.operator.shell"] = keyword_info
    
    # Use function color for shell builtins
    if "entity.name.function" in color_map:
        color_map["support.function.builtin.shell"] = color_map["entity.name.function"]
    
    # Use variable color for shell variables
    if "variable" in color_map or "variable.other.go" in color_map:
        var_info = color_map.get("variable.other.go", color_map.get("variable", {}))
        if var_info:
            color_map["variable.other.readwrite.shell"] = var_info
            color_map["variable.other.shell"] = var_info
    
    # Use punctuation/delimiter color for shell variable punctuation ${}
    if "punctuation.separator.key-value.json" in color_map:
        # Use a distinct color for ${} punctuation
        punc_info = color_map["punctuation.separator.key-value.json"].copy()
        color_map["punctuation.definition.variable.shell"] = punc_info
        color_map["punctuation.section.embedded.begin.shell"] = punc_info
        color_map["punctuation.section.embedded.end.shell"] = punc_info
    elif "punctuation.definition.block" in color_map:
        punc_info = color_map["punctuation.definition.block"].copy()
        color_map["punctuation.definition.variable.shell"] = punc_info
        color_map["punctuation.section.embedded.begin.shell"] = punc_info
        color_map["punctuation.section.embedded.end.shell"] = punc_info
    
    # Use string color for shell strings
    if "string" in color_map:
        color_map["string.quoted.double.shell"] = color_map["string"]
        color_map["string.quoted.single.shell"] = color_map["string"]
    
    # Optimize foreground colors for better contrast
    # Ensure text colors are bright enough against dark backgrounds
    def ensure_contrast(color_info, theme_name):
        """Ensure color has good contrast - brighten if needed."""
        if not color_info or "color" not in color_info:
            return color_info
        
        color = color_info["color"].lstrip('#')
        if len(color) >= 6:
            r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
            
            # Calculate relative luminance
            luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            
            # If too dark (< 40% luminance), brighten it
            if luminance < 0.4:
                boost = 1.3
                r = min(255, int(r * boost))
                g = min(255, int(g * boost))
                b = min(255, int(b * boost))
                color_info["color"] = f"#{r:02x}{g:02x}{b:02x}"
        
        return color_info
    
    # Apply contrast optimization to key syntax elements
    for scope in ["variable", "entity.name.function", "string", "keyword"]:
        if scope in color_map:
            color_map[scope] = ensure_contrast(color_map[scope], theme_name)
    
    # Now build Zed syntax with priority - most specific last
    syntax = {}
    
    def add_syntax(zed_key, vscode_scopes, default_color=None, default_style=""):
        """Add syntax color by checking multiple VS Code scopes."""
        for scope in vscode_scopes:
            if scope in color_map:
                entry = {"color": hex_to_rgb(color_map[scope]["color"])}
                style = color_map[scope]["font_style"]
                if "italic" in style:
                    entry["font_style"] = "italic"
                if "bold" in style:
                    entry["font_weight"] = 700
                syntax[zed_key] = entry
                return
        if default_color:
            entry = {"color": hex_to_rgb(default_color)}
            if "italic" in default_style:
                entry["font_style"] = "italic"
            if "bold" in default_style:
                entry["font_weight"] = 700
            syntax[zed_key] = entry
    
    # Map Zed syntax categories to VS Code scopes (in priority order)
    # Base text
    add_syntax("text", ["source.go", "source.python", "source.js"], colors.get("editor.foreground", "#e6edf3"))
    
    # Comments - multiple types for flexibility
    add_syntax("comment", ["comment", "comment.line", "comment.block"])
    add_syntax("comment.doc", ["comment.block.documentation.js", "comment.block.documentation.ts", "comment.line.documentation"])
    
    # Keywords
    add_syntax("keyword", ["keyword.control.terraform", "keyword.control.go", "keyword.control", "keyword"])
    
    # Strings - language-specific mappings
    add_syntax("string", [
        "string.quoted.double.terraform", "string.quoted.single.terraform",
        "string.quoted.double.go", "string.quoted.single.go",
        "string", "string.quoted.double", "string.quoted.single"
    ])
    # JS/TS/JSON strings (often different color)
    add_syntax("string.special", [
        "string.value.json",
        "string.quoted.double.js", "string.quoted.single.js",
        "string.quoted.double.ts", "string.quoted.single.ts",
        "string.quoted.double.tsx", "string.quoted.single.tsx"
    ])
    # YAML strings (often different color)
    add_syntax("string.special.path", [
        "string.quoted.double.yaml", "string.quoted.single.yaml"
    ])
    add_syntax("string.special.key", ["string.unquoted.plain.out.yaml", "string.unquoted"])
    add_syntax("string.escape", ["constant.character.escape"])
    add_syntax("string.regex", ["string.regexp"])
    
    # Packages/Imports/Modules - distinct from variables
    # Use multiple Zed keys to ensure package colors are different
    add_syntax("namespace", ["entity.name.import.go", "variable.other.package.go"])
    add_syntax("module", ["entity.name.import.go", "variable.other.package.go"])
    add_syntax("label", ["entity.name.import.go", "variable.other.package.go"])
    add_syntax("link_text", ["entity.name.import.path.go"])
    add_syntax("preproc", ["entity.name.import.go", "variable.other.package.go"])
    
    # Makefile strings (often different)
    add_syntax("string.special.symbol", [
        "string.quoted.double.makefile", "string.quoted.single.makefile"
    ])
    
    # Numbers - language-specific
    add_syntax("number", [
        "constant.numeric.terraform", "constant.numeric.go",
        "constant.numeric"
    ])
    # JS/TS/JSON/YAML numbers (often different color)
    add_syntax("primary", [
        "constant.numeric.json", "constant.numeric.js", "constant.numeric.ts",
        "constant.numeric.tsx", "constant.numeric.yaml"
    ])
    
    # Booleans - language-specific
    add_syntax("boolean", [
        "constant.language.boolean.terraform", "constant.language.boolean.go",
        "constant.language.boolean"
    ])
    # JS/TS/JSON/YAML booleans
    add_syntax("primary.boolean", [
        "constant.language.boolean.json", "constant.language.boolean.js",
        "constant.language.boolean.ts", "constant.language.boolean.tsx",
        "constant.language.boolean.yaml"
    ])
    
    # Null/None
    add_syntax("constant", [
        "constant.language.null", "constant.language.nil"
    ])
    add_syntax("constructor", [
        "support.constant.terraform", "support.constant"
    ])
    
    # Functions - language-specific
    add_syntax("function", [
        "entity.name.function.go",
        "entity.name.function", "meta.function-call"
    ])
    # Terraform functions (often different)
    add_syntax("function.method", ["entity.name.function.terraform"])
    # Built-in functions
    add_syntax("function.builtin", [
        "support.function.builtin.terraform", "support.function.builtin"
    ])
    
    # Types - language-specific
    add_syntax("type", [
        "entity.name.type.go", "entity.name.type"
    ])
    # Terraform/language-specific types
    add_syntax("type.interface", ["entity.name.type.terraform"])
    add_syntax("type.builtin", ["storage.type.go", "storage.type.terraform", "storage.type"])
    
    # Variables - base for most languages
    add_syntax("variable", [
        "variable.other.go", "variable",
        "variable.other"
    ])
    # Terraform variables (often different)
    add_syntax("variable.member", [
        "variable.other.terraform", "variable.other.readwrite.terraform"
    ])
    add_syntax("variable.parameter", ["variable.parameter"])
    add_syntax("variable.special", ["variable.language"])
    
    # Properties and keys - language-specific
    add_syntax("property", [
        "support.type.property-name.json"
    ])
    # JS/TS object keys
    add_syntax("variant", [
        "meta.object-literal.key.js", "meta.object-literal.key.ts",
        "meta.object-literal.key.tsx"
    ])
    
    # YAML tags and keys
    add_syntax("tag", ["entity.name.tag.yaml"])
    add_syntax("enum", ["entity.name.alias.yaml"])
    
    # Operators
    add_syntax("operator", ["keyword.operator"])
    
    # Punctuation - language-specific
    add_syntax("punctuation", ["punctuation"])
    # JS/TS/Terraform blocks
    add_syntax("punctuation.bracket", [
        "punctuation.definition.block.terraform",
        "punctuation.definition.block.js", "punctuation.definition.block.ts",
        "punctuation.definition.block.tsx", "punctuation.definition.block"
    ])
    # Separators
    add_syntax("punctuation.delimiter", [
        "punctuation.separator.key-value.json",
        "punctuation.separator.key-value.js", "punctuation.separator.key-value.ts",
        "punctuation.separator.key-value.tsx", "punctuation.separator.key-value",
        "punctuation.separator"
    ])
    
    # Attributes
    add_syntax("attribute", ["entity.other.attribute-name"])
    
    # Links
    add_syntax("link_uri", ["entity.name.anchor.yaml", "entity.name.anchor"])
    
    # Markup
    add_syntax("title", ["entity.name.section", "markup.heading"])
    add_syntax("emphasis", ["markup.italic"])
    add_syntax("strong", ["markup.bold"])
    
    # Makefile specific
    add_syntax("title.special", [
        "entity.name.function.target.makefile", "meta.scope.target.makefile",
        "meta.scope.prerequisites.makefile"
    ])
    add_syntax("hint", [
        "variable.assignment.makefile"
    ])
    # Makefile keywords
    add_syntax("keyword.makefile", ["keyword.control.makefile"])
    
    # Bash/Shell specific tokens
    # Shell variables and interpolation
    add_syntax("variable.special", [
        "variable.other.readwrite.shell", "variable.other.shell",
        "variable.language.shell", "variable.language"
    ])
    add_syntax("punctuation.special", [
        "punctuation.definition.variable.shell",
        "punctuation.section.embedded.begin.shell",
        "punctuation.section.embedded.end.shell"
    ])
    # Shell strings
    add_syntax("string.special.symbol", [
        "string.quoted.double.shell", "string.quoted.single.shell",
        "string.unquoted.argument.shell"
    ])
    # Shell commands
    add_syntax("function.builtin", [
        "support.function.builtin.terraform", "support.function.builtin",
        "support.function.builtin.shell"
    ])
    add_syntax("constructor", [
        "support.constant.terraform", "support.constant",
        "support.class.shell"
    ])
    # Shell keywords
    add_syntax("keyword", [
        "keyword.control.terraform", "keyword.control.go", "keyword.control",
        "keyword.control.shell", "keyword.operator.shell", "keyword"
    ])
    
    # Ensure we have default text color for editor
    if "text" not in syntax and colors.get("editor.foreground"):
        syntax["text"] = {"color": hex_to_rgb(colors["editor.foreground"])}
    
    # Remove any None values
    syntax = {k: v for k, v in syntax.items() if v is not None}
    
    # Add thematic backgrounds based on character
    style_colors = {
        "background": hex_to_rgb(colors.get("editor.background", "#0d1117")),
        "foreground": hex_to_rgb(colors.get("editor.foreground", "#e6edf3")),
        "cursor": hex_to_rgb(colors.get("editorCursor.foreground", "#FFD700")),
        "selection": hex_to_rgb(colors.get("editor.selectionBackground", "#264f78")),
        "selection.match": hex_to_rgb(colors.get("editor.selectionHighlightBackground", "#3b3b3b60")),
        "line_number": hex_to_rgb(colors.get("editorLineNumber.foreground", "#6e7681")),
        "line_number.active": hex_to_rgb(colors.get("editorLineNumber.activeForeground", "#FFD700")),
        "title_bar.background": hex_to_rgb(colors.get("titleBar.activeBackground", "#161b22")),
        "toolbar.background": hex_to_rgb(colors.get("activityBar.background", "#161b22")),
        "tab_bar.background": hex_to_rgb(colors.get("tab.inactiveBackground", "#161b22")),
        "tab.active_background": hex_to_rgb(colors.get("tab.activeBackground", "#21262d")),
        "tab.inactive_background": hex_to_rgb(colors.get("tab.inactiveBackground", "#161b22")),
        "panel.background": hex_to_rgb(colors.get("panel.background", "#161b22")),
        "status_bar.background": hex_to_rgb(colors.get("statusBar.background", "#161b22")),
        "editor.line_highlight_background": hex_to_rgb(colors.get("editor.lineHighlightBackground", "#161b22")),
        "editor.gutter.background": hex_to_rgb(colors.get("editor.background", "#0d1117")),
        "editor.active_line_background": hex_to_rgb(colors.get("editor.lineHighlightBackground", "#161b22")),
        "border": hex_to_rgb(colors.get("panel.border", "#21262d")),
        "border.variant": hex_to_rgb(colors.get("tab.border", "#21262d")),
    }
    
    # Apply thematic backgrounds
    style_colors = add_thematic_background(style_colors, theme_name)
    
    # Add One Dark inspired UI refinements
    # Better contrast for important UI elements
    style_colors["text"] = style_colors.get("foreground", "#abb2bf")
    
    # Ensure cursors are highly visible
    cursor_color = style_colors.get("cursor", "#FFD700")
    style_colors["cursor"] = cursor_color
    style_colors["players"] = [
        {"cursor": cursor_color, "selection": style_colors.get("selection", "#264f78")}
    ]
    
    # Better error/warning/info colors (One Dark style)
    style_colors["error"] = "#E06C75"
    style_colors["error_background"] = "#E06C7520"
    style_colors["warning"] = "#E5C07B"  
    style_colors["warning_background"] = "#E5C07B20"
    style_colors["info"] = "#61AFEF"
    style_colors["info_background"] = "#61AFEF20"
    style_colors["hint"] = "#98C379"
    style_colors["hint_background"] = "#98C37920"
    
    # Better git colors
    style_colors["created"] = "#98C379"
    style_colors["modified"] = "#E5C07B"
    style_colors["deleted"] = "#E06C75"
    style_colors["renamed"] = "#61AFEF"
    style_colors["conflict"] = "#C678DD"
    
    # Improved search highlighting
    style_colors["search.match_background"] = style_colors.get("border", "#FFD700") + "40"
    
    # Better terminal colors (ANSI)
    style_colors["terminal.ansi.black"] = "#282C34"
    style_colors["terminal.ansi.red"] = "#E06C75"
    style_colors["terminal.ansi.green"] = "#98C379"
    style_colors["terminal.ansi.yellow"] = "#E5C07B"
    style_colors["terminal.ansi.blue"] = "#61AFEF"
    style_colors["terminal.ansi.magenta"] = "#C678DD"
    style_colors["terminal.ansi.cyan"] = "#56B6C2"
    style_colors["terminal.ansi.white"] = "#ABB2BF"
    style_colors["terminal.ansi.bright_black"] = "#5C6370"
    style_colors["terminal.ansi.bright_red"] = "#E06C75"
    style_colors["terminal.ansi.bright_green"] = "#98C379"
    style_colors["terminal.ansi.bright_yellow"] = "#E5C07B"
    style_colors["terminal.ansi.bright_blue"] = "#61AFEF"
    style_colors["terminal.ansi.bright_magenta"] = "#C678DD"
    style_colors["terminal.ansi.bright_cyan"] = "#56B6C2"
    style_colors["terminal.ansi.bright_white"] = "#FFFFFF"
    
    # Build the Zed theme structure
    zed_theme = {
        "$schema": "https://zed.dev/schema/themes/v0.1.0.json",
        "name": theme_name,
        "author": "Dragon Ball Theme",
        "themes": [
            {
                "name": theme_name,
                "appearance": vscode_theme.get("type", "dark"),
                "style": {
                    **style_colors,
                    "syntax": syntax
                }
            }
        ]
    }
    
    return zed_theme


def main():
    """Main conversion function."""
    
    # Get the themes directory
    themes_dir = Path("themes")
    zed_themes_dir = Path("zed-themes")
    
    # Create output directory
    zed_themes_dir.mkdir(exist_ok=True)
    
    # Process each theme file
    theme_files = sorted(themes_dir.glob("*-color-theme.json"))
    
    print(f"Converting {len(theme_files)} VS Code themes to Zed format...\n")
    
    # Ask user about background variants
    print("Generate background variants? (themed/dark/all) [themed]: ", end="")
    import sys
    variant_choice = input().strip().lower() or "themed"
    print()
    
    for theme_file in theme_files:
        print(f"Converting {theme_file.name}...")
        
        try:
            # Read VS Code theme
            with open(theme_file, 'r', encoding='utf-8') as f:
                # Remove comments from JSON (simple approach)
                content = f.read()
                lines = []
                for line in content.split('\n'):
                    # Remove inline comments
                    if '//' in line:
                        # Keep the part before //
                        line = line.split('//')[0]
                    lines.append(line)
                clean_content = '\n'.join(lines)
                vscode_theme = json.loads(clean_content)
            
            # Get theme name from the file
            theme_name = vscode_theme.get("name", theme_file.stem.replace("-color-theme", ""))
            
            # Convert to Zed format
            base_zed_theme = convert_vscode_to_zed(vscode_theme, theme_name)
            
            # Generate base theme (always create)
            base_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}.json"
            
            if variant_choice in ["themed", "all"]:
                # Themed background variants
                with open(base_output_file, 'w', encoding='utf-8') as f:
                    json.dump(base_zed_theme, f, indent=2)
                print(f"  ✓ Created {base_output_file.name}")
                
                # Generate darker variant (themed)
                darker_theme = create_theme_variant(base_zed_theme, "Darker", -0.15)
                darker_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}-darker.json"
                with open(darker_output_file, 'w', encoding='utf-8') as f:
                    json.dump(darker_theme, f, indent=2)
                print(f"  ✓ Created {darker_output_file.name}")
                
                # Generate lighter variant (themed)
                lighter_theme = create_theme_variant(base_zed_theme, "Lighter", 0.15)
                lighter_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}-lighter.json"
                with open(lighter_output_file, 'w', encoding='utf-8') as f:
                    json.dump(lighter_theme, f, indent=2)
                print(f"  ✓ Created {lighter_output_file.name}")
            
            if variant_choice in ["dark", "all"]:
                # Dark background variants (One Dark style)
                dark_theme = create_dark_variant(base_zed_theme, "Dark", "base")
                dark_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}-dark.json"
                with open(dark_output_file, 'w', encoding='utf-8') as f:
                    json.dump(dark_theme, f, indent=2)
                print(f"  ✓ Created {dark_output_file.name}")
                
                # Generate darker dark variant
                darker_dark_theme = create_dark_variant(base_zed_theme, "Dark Deeper", "darker")
                darker_dark_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}-dark-deeper.json"
                with open(darker_dark_output_file, 'w', encoding='utf-8') as f:
                    json.dump(darker_dark_theme, f, indent=2)
                print(f"  ✓ Created {darker_dark_output_file.name}")
                
                # Generate lighter dark variant
                lighter_dark_theme = create_dark_variant(base_zed_theme, "Dark Softer", "lighter")
                lighter_dark_output_file = zed_themes_dir / f"{theme_file.stem.replace('-color-theme', '')}-dark-softer.json"
                with open(lighter_dark_output_file, 'w', encoding='utf-8') as f:
                    json.dump(lighter_dark_theme, f, indent=2)
                print(f"  ✓ Created {lighter_dark_output_file.name}")
            
        except Exception as e:
            print(f"  ✗ Error converting {theme_file.name}: {e}")
    
    print(f"\n✓ Conversion complete! Zed themes saved to {zed_themes_dir}/")
    print(f"\nTo use these themes in Zed:")
    print(f"  1. Copy the JSON files to: ~/.config/zed/themes/")
    print(f"  2. Restart Zed or reload the theme list")
    print(f"  3. Select your Dragon Ball theme from the theme picker")
    
    if variant_choice == "all":
        print(f"\nGenerated variants:")
        print(f"  Themed backgrounds (character-specific):")
        print(f"    - Base themes")
        print(f"    - Darker variants (15% darker)")
        print(f"    - Lighter variants (15% lighter)")
        print(f"  Dark backgrounds (One Dark style):")
        print(f"    - Dark variants (neutral dark bg)")
        print(f"    - Dark Deeper (darker neutral)")
        print(f"    - Dark Softer (lighter neutral)")
        print(f"\n  Total: {len(theme_files) * 6} themes (15 characters × 6 variants)")
    elif variant_choice == "themed":
        print(f"\nGenerated themed background variants:")
        print(f"  - Base themes (character backgrounds)")
        print(f"  - Darker variants (15% darker)")
        print(f"  - Lighter variants (15% lighter)")
        print(f"\n  Total: {len(theme_files) * 3} themes")
    elif variant_choice == "dark":
        print(f"\nGenerated dark background variants:")
        print(f"  - Dark (neutral One Dark style)")
        print(f"  - Dark Deeper (darker neutral)")
        print(f"  - Dark Softer (lighter neutral)")
        print(f"\n  Total: {len(theme_files) * 3} themes")


if __name__ == "__main__":
    main()
