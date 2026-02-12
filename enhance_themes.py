#!/usr/bin/env python3
"""
Enhance all Dragon Ball VS Code themes with One Dark-style rich color palettes.
Each theme will maintain its character-specific accent colors while gaining
expanded syntax highlighting, better contrast, and professional appearance.
"""

import json
import os
import re
from pathlib import Path

def strip_jsonc_comments(text):
    """Remove comments from JSONC text."""
    # Remove single-line comments
    text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
    # Remove multi-line comments
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    return text

# Theme accent color mappings (primary, secondary, tertiary)
THEME_COLORS = {
    "piccolo": {
        "primary": "#7FFF00",     # Piccolo green
        "secondary": "#a98bff",    # Piccolo purple  
        "tertiary": "#ffa657",     # Orange/Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#79c0ff",      # Blue
    },
    "vegeta": {
        "primary": "#1976D2",      # Royal blue
        "secondary": "#A084CA",    # Purple
        "tertiary": "#FFD700",     # Gold
        "strings": "#7AA3D8",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "goku": {
        "primary": "#F47C2C",      # Orange
        "secondary": "#FFD700",    # Gold
        "tertiary": "#1D4A9B",     # Blue
        "strings": "#6BB6FF",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "trunks": {
        "primary": "#6BC7FF",      # Cyan blue
        "secondary": "#A084CA",    # Purple
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "frieza": {
        "primary": "#DDA0DD",      # Plum
        "secondary": "#FFD700",    # Gold
        "tertiary": "#FF6FD8",     # Pink
        "strings": "#DDA0DD",      # Plum
        "numbers": "#FF6FD8",      # Pink
    },
    "gohan": {
        "primary": "#A084CA",      # Purple
        "secondary": "#FFD700",    # Gold
        "tertiary": "#6BB6FF",     # Blue
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "majin-buu": {
        "primary": "#F7768E",      # Pink
        "secondary": "#FFD700",    # Gold
        "tertiary": "#d2a8ff",     # Light purple
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "broly": {
        "primary": "#6BFFB8",      # Mint green
        "secondary": "#7CFF6B",    # Light green
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "beerus": {
        "primary": "#A084CA",      # Purple
        "secondary": "#FFD700",    # Gold
        "tertiary": "#6BB6FF",     # Blue
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "android-18": {
        "primary": "#6BC7FF",      # Cyan blue
        "secondary": "#A084CA",    # Purple
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "cell": {
        "primary": "#7FFF00",      # Chartreuse green
        "secondary": "#32CD32",    # Lime green
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "jiren": {
        "primary": "#FF2D2D",      # Red
        "secondary": "#7C7C8C",    # Gray
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FF2D2D",      # Red
    },
    "super-saiyan-blue": {
        "primary": "#00BFFF",      # Deep sky blue
        "secondary": "#FFD700",    # Gold
        "tertiary": "#00FFFF",     # Cyan
        "strings": "#98d3ff",      # Light blue
        "numbers": "#00FFFF",      # Cyan
    },
    "super-saiyan-4": {
        "primary": "#FF4B4B",      # Red
        "secondary": "#FFD700",    # Gold
        "tertiary": "#FF8C00",     # Dark orange
        "strings": "#98d3ff",      # Light blue
        "numbers": "#FFD700",      # Gold
    },
    "dragon-ball": {
        "primary": "#FF9800",      # Orange
        "secondary": "#1976D2",    # Blue
        "tertiary": "#FFD700",     # Gold
        "strings": "#98d3ff",      # Light blue
        "numbers": "#1976D2",      # Blue
    },
}

def create_enhanced_token_colors(theme_key, colors):
    """Generate enhanced token colors based on theme colors."""
    return [
        # Comments
        {"scope": ["comment", "comment.line", "comment.block"], "settings": {"foreground": "#6a737d", "fontStyle": "italic"}},
        {"scope": ["comment.block.documentation", "comment.line.documentation"], "settings": {"foreground": "#8b949e"}},
        
        # Keywords and Control Flow
        {"scope": ["keyword", "keyword.control", "keyword.operator.new", "keyword.operator.expression"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["keyword.control.go", "keyword.function.go", "keyword.const.go", "keyword.var.go"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["keyword.operator", "keyword.operator.assignment", "keyword.operator.arithmetic", "keyword.operator.logical"], "settings": {"foreground": colors["primary"]}},
        
        # Storage and Types
        {"scope": ["storage.type", "storage.modifier", "storage.type.go"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["entity.name.type", "entity.name.class", "support.class", "support.type"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold"}},
        {"scope": ["entity.name.type.go"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold"}},
        
        # Functions and Methods
        {"scope": ["entity.name.function", "entity.name.function.go", "support.function"], "settings": {"foreground": colors["tertiary"], "fontStyle": "italic"}},
        {"scope": ["entity.name.method", "entity.name.method.go"], "settings": {"foreground": colors["tertiary"], "fontStyle": "italic"}},
        {"scope": ["support.function.builtin", "support.function.magic"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold italic"}},
        
        # Variables and Parameters
        {"scope": ["variable", "variable.other", "variable.other.go"], "settings": {"foreground": "#e6edf3"}},
        {"scope": ["variable.parameter", "variable.parameter.function"], "settings": {"foreground": colors["tertiary"]}},
        {"scope": ["variable.other.constant", "variable.other.enummember"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["variable.language", "variable.language.this", "variable.language.super"], "settings": {"foreground": "#ff7b72", "fontStyle": "italic"}},
        
        # Strings and Constants
        {"scope": ["string", "string.quoted", "string.quoted.double.go", "string.quoted.single.go"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["string.template", "string.interpolated"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["string.regexp"], "settings": {"foreground": "#7ee787"}},
        {"scope": ["constant.numeric", "constant.numeric.go", "constant.numeric.integer", "constant.numeric.float"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["constant.language", "constant.language.boolean", "constant.language.null", "constant.language.undefined"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["constant.character.escape"], "settings": {"foreground": "#56d364"}},
        
        # Properties and Attributes
        {"scope": ["variable.other.property", "variable.other.object.property", "support.variable.property"], "settings": {"foreground": "#e6edf3"}},
        {"scope": ["meta.object-literal.key", "variable.object.property"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["entity.name.tag.yaml", "entity.name.tag"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        
        # Decorators and Annotations
        {"scope": ["meta.decorator", "meta.decorator.python", "entity.name.function.decorator"], "settings": {"foreground": colors["secondary"], "fontStyle": "italic"}},
        {"scope": ["storage.type.annotation", "punctuation.definition.annotation"], "settings": {"foreground": colors["secondary"]}},
        
        # Punctuation
        {"scope": ["punctuation.definition.string", "punctuation.definition.variable"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["punctuation.section.embedded"], "settings": {"foreground": "#ff7b72"}},
        {"scope": ["punctuation.separator", "punctuation.terminator"], "settings": {"foreground": "#c9d1d9"}},
        {"scope": ["punctuation.definition.tag"], "settings": {"foreground": colors["primary"]}},
        
        # Imports and Modules
        {"scope": ["entity.name.import.go", "variable.other.package.go"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold"}},
        {"scope": ["entity.name.import.path.go"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold underline"}},
        {"scope": ["keyword.control.import", "keyword.control.from", "keyword.control.export"], "settings": {"foreground": "#ff7b72"}},
        
        # Classes and Interfaces
        {"scope": ["entity.name.type.class", "entity.name.type.interface"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold"}},
        {"scope": ["entity.other.inherited-class"], "settings": {"foreground": colors["tertiary"], "fontStyle": "italic"}},
        
        # Source Go fallback
        {"scope": ["source.go"], "settings": {"foreground": "#e6edf3"}},
        
        # YAML
        {"scope": ["entity.name.tag.yaml"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["entity.name.anchor.yaml"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold underline"}},
        {"scope": ["entity.name.alias.yaml"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold"}},
        {"scope": ["string.unquoted.plain.out.yaml"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["string.quoted.double.yaml", "string.quoted.single.yaml"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["constant.numeric.yaml"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["constant.language.boolean.yaml"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["constant.language.null.yaml"], "settings": {"foreground": "#8b949e", "fontStyle": "italic"}},
        {"scope": ["comment.line.number-sign.yaml"], "settings": {"foreground": "#6a737d", "fontStyle": "italic"}},
        
        # JSON, JS, TS
        {"scope": ["support.type.property-name.json", "meta.object-literal.key.js", "meta.object-literal.key.ts", "meta.object-literal.key.tsx"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["string.value.json", "string.quoted.double.js", "string.quoted.single.js", "string.quoted.double.ts", "string.quoted.single.ts", "string.quoted.double.tsx", "string.quoted.single.tsx"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["constant.numeric.json", "constant.numeric.js", "constant.numeric.ts", "constant.numeric.tsx"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["constant.language.boolean.json", "constant.language.boolean.js", "constant.language.boolean.ts", "constant.language.boolean.tsx"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["constant.language.null.json", "constant.language.null.js", "constant.language.null.ts", "constant.language.null.tsx"], "settings": {"foreground": "#8b949e", "fontStyle": "italic"}},
        {"scope": ["comment.line.double-slash.js", "comment.line.double-slash.ts", "comment.line.double-slash.tsx", "comment.block.documentation.js", "comment.block.documentation.ts", "comment.block.documentation.tsx"], "settings": {"foreground": "#6a737d", "fontStyle": "italic"}},
        {"scope": ["punctuation.separator.key-value.json", "punctuation.separator.key-value.js", "punctuation.separator.key-value.ts", "punctuation.separator.key-value.tsx"], "settings": {"foreground": "#c9d1d9"}},
        {"scope": ["punctuation.definition.block.js", "punctuation.definition.block.ts", "punctuation.definition.block.tsx"], "settings": {"foreground": "#c9d1d9"}},
        
        # Makefile
        {"scope": ["keyword.control.makefile"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["variable.assignment.makefile"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["entity.name.function.target.makefile"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold underline"}},
        {"scope": ["meta.scope.target.makefile"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold"}},
        {"scope": ["meta.scope.prerequisites.makefile"], "settings": {"foreground": "#e6edf3", "fontStyle": ""}},
        {"scope": ["support.constant.makefile"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold"}},
        {"scope": ["string.quoted.double.makefile", "string.quoted.single.makefile"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["comment.line.number-sign.makefile"], "settings": {"foreground": "#6a737d", "fontStyle": "italic"}},
        
        # Terraform
        {"scope": ["keyword.control.terraform"], "settings": {"foreground": colors["primary"], "fontStyle": "bold"}},
        {"scope": ["variable.other.terraform"], "settings": {"foreground": "#e6edf3"}},
        {"scope": ["entity.name.function.terraform", "variable.other.readwrite.terraform"], "settings": {"foreground": colors["secondary"], "fontStyle": "italic"}},
        {"scope": ["entity.name.type.terraform"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold"}},
        {"scope": ["string.quoted.double.terraform", "string.quoted.single.terraform"], "settings": {"foreground": colors["strings"]}},
        {"scope": ["constant.numeric.terraform"], "settings": {"foreground": colors["numbers"]}},
        {"scope": ["constant.language.boolean.terraform"], "settings": {"foreground": colors["numbers"], "fontStyle": "bold"}},
        {"scope": ["comment.line.number-sign.terraform"], "settings": {"foreground": "#6a737d", "fontStyle": "italic"}},
        {"scope": ["support.constant.terraform"], "settings": {"foreground": colors["tertiary"], "fontStyle": "bold"}},
        {"scope": ["punctuation.definition.block.terraform"], "settings": {"foreground": "#c9d1d9"}},
        {"scope": ["support.function.builtin.terraform"], "settings": {"foreground": colors["secondary"], "fontStyle": "bold italic"}},
    ]

def update_theme(theme_path, theme_key, colors):
    """Update a theme file with enhanced token colors."""
    with open(theme_path, 'r') as f:
        content = f.read()
        # Strip comments and parse
        clean_content = strip_jsonc_comments(content)
        theme = json.loads(clean_content)
    
    # Update token colors
    theme['tokenColors'] = create_enhanced_token_colors(theme_key, colors)
    
    # Write back (clean JSON format)
    with open(theme_path, 'w') as f:
        json.dump(theme, f, indent=2)
    
    print(f"✓ Updated {theme_path.name}")

def main():
    themes_dir = Path(__file__).parent / "themes"
    
    # Skip piccolo as it's already updated manually
    for theme_key, colors in THEME_COLORS.items():
        if theme_key == "piccolo":
            print(f"⊘ Skipping {theme_key} (already updated)")
            continue
            
        theme_file = themes_dir / f"{theme_key}-color-theme.json"
        
        if theme_file.exists():
            update_theme(theme_file, theme_key, colors)
        else:
            print(f"✗ Theme file not found: {theme_file}")
    
    print("\n✓ All themes updated with enhanced color palettes!")
    print("  Themes now have One Dark-style rich syntax highlighting")
    print("  with better contrast, readability, and professional appearance.")

if __name__ == "__main__":
    main()
