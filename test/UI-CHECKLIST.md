# Workspace Colors — Real UI Checklist

Automated tests cover pure logic and headless Extension Host configuration scoping. The
following scenarios require a human driving actual VS Code UI (Quick Pick/Input Box automation
is intentionally not simulated). Record actual observations, not assumptions, for each row.

| # | Scenario | Steps | Expected result | Observed |
|---|----------|-------|------------------|----------|
| 1 | Install, no mutation | Install the VSIX into an isolated profile, open a folder, reload | No `workbench.colorCustomizations` write occurs | |
| 2 | Custom hex | Run `Dragon Ball: Configure Workspace Colors`, choose custom, enter `#1976D2` | Title bar recolors; foreground readable | |
| 3 | Presets | Repeat with Goku, Vegeta, Piccolo presets | Each applies its documented color | |
| 4 | Invalid hex | Enter `red`, `#12`, `#1234567`, empty string | Input box shows validation error, no write | |
| 5 | Cancel at accent step | Press Escape at the accent Quick Pick | No settings change | |
| 6 | Cancel at surface step | Press Escape at the surfaces Quick Pick | No settings change | |
| 7 | Optional surfaces | Enable status bar and activity bar | Distinct backgrounds/foregrounds for each, all readable | |
| 8 | Light theme | Apply an accent while a light theme is active | Foreground still readable on title/status/activity | |
| 9 | Dark theme | Apply an accent while a dark theme is active | Foreground still readable | |
| 10 | High-contrast theme | Apply an accent under a high-contrast theme | Note any native override or limitation observed | |
| 11 | Active vs inactive title | Switch focus away from and back to the window | Active and inactive backgrounds are visibly distinguishable | |
| 12 | Debugging status color | Start a debug session with status bar surface enabled | Debugging background/foreground remain readable | |
| 13 | Hover states | Hover over title bar/status bar/activity bar items | No broken hover contrast | |
| 14 | Multi-root (saved) | Open a saved `.code-workspace`, configure | Writes to the shared workspace file, not per-folder | |
| 15 | Empty window | Run configure command with no folder open | Refused with actionable message, no write | |
| 16 | Untitled multi-root | Add a second folder without saving the workspace, run configure | Refused with actionable message, no write | |
| 17 | Existing root override | Pre-set `titleBar.activeBackground` manually, then configure | Confirmation names the conflicting key; cancel leaves it unchanged | |
| 18 | Theme-specific override | Add a `"[Some Theme]": { "titleBar.activeBackground": ... }` block, then configure | Title surface is blocked/reported, not silently edited | |
| 19 | Peacock present | Install Peacock, then configure | Advisory warning shown; no Peacock command invoked | |
| 20 | Peacock active edit | Have Peacock actively managing a key we also plan to own | Conflict surfaced like any other explicit override | |
| 21 | Disable restores | Configure, then run `Dragon Ball: Disable Workspace Colors` | Owned keys restored to original presence/value; unrelated keys untouched | |
| 22 | Re-enable | Disable, then configure again | Fresh acquisition, no stale journal reused | |
| 23 | External edit before disable | After configuring, manually edit one owned key, then disable | That key is reported as lost ownership and left untouched; others restored | |
| 24 | Native title bar limitation | Observe on Windows/macOS native title bar rendering | Report whether `titleBar.*` visibly applies; do not change `window.titleBarStyle` | |

## Revision 2 Launcher Checks

Run each row on VS Code 1.60.0 and current stable using the exact packaged VSIX in isolated
target-local fixtures. Record the host version and archive SHA-256 with observations. These rows
are NOT RUN; automated startup/adapter checks do not establish visible UI or installation success.

| # | Scenario | Steps | Expected result | Observed |
|---|----------|-------|------------------|----------|
| 25 | Lazy startup | Install the archive, open a fresh supported workspace, do not invoke a command | Exactly one paintcan launcher appears; no prompts, settings or ownership-state changes | |
| 26 | Direct launcher flow | Click the paintcan before any coloring; try each preset and custom `#RGB`/`#RRGGBB` | Existing accent and optional-surface flow opens directly; syntax theme unchanged | |
| 27 | Independent visibility | Configure title only, toggle optional surfaces, then disable coloring | Same launcher remains available throughout; no duplicates | |
| 28 | Cancellation | Cancel each picker/input/confirmation reached through the launcher | No command-induced settings/state change; launcher remains usable | |
| 29 | Keyboard and accessibility | Focus the status bar by keyboard, activate the item, inspect its tooltip and screen-reader label | Paintcan is keyboard-operable; label and tooltip are Configure Workspace Colors | |
| 30 | Theme readability | Inspect the item with light, dark and high-contrast themes, including hover/focus | Theme-provided icon and focus indication remain readable | |
| 31 | Unsupported windows | Click the launcher in empty and untitled multi-root windows | Launcher is present; actionable refusal and no writes | |
| 32 | Hidden status bar/item | Hide the bar, then separately hide the item; use Command Palette configure/disable | Hidden UI is respected; commands remain usable; visibility preferences unchanged | |
| 33 | Zen Mode | Enter Zen Mode with the status bar hidden, use palette commands, exit | No forced visibility; launcher returns according to user preferences | |
| 34 | Reload and disposal | Repeatedly configure/disable/reload; disable extension, then re-enable | One item per active extension instance; disposal removes it; reload does not recolor or recover automatically | |

## Revision 3 Surface Checks

The user-supplied screenshots are evidence only for the visible dark-theme rows marked below.
They do not establish isolated installation, accessibility, restoration, light/high-contrast, or
unsupported-window behavior.

| # | Scenario | Steps | Expected result | Observed |
|---|----------|-------|-----------------|----------|
| 35 | All presets | Open the accent picker after installing 2.2.0 | Custom hex and all 15 theme presets are listed | Not run on exact 2.2.0 archive |
| 36 | Sidebar and Copilot Chat | Select the recommended sidebar surface in a dark theme | Explorer and Copilot Chat use a subdued hue-matched background with readable text | Observed in user screenshot on 2026-09-15 using the pre-release feature build; readable blue and red variants shown |
| 37 | Panel and terminal | Select the recommended panel surface in a dark theme and open Terminal | Panel and terminal backgrounds are subdued and readable; ANSI palette remains theme-controlled | Background/readability observed in user screenshot on 2026-09-15 using the pre-release feature build; ANSI palette not exercised |
| 38 | Editor isolation | Configure all recommended surfaces | Editor canvas and syntax colors remain controlled by the selected Dragon Ball theme | Observed in user screenshot on 2026-09-15 using the pre-release feature build |
| 39 | Light/high-contrast surfaces | Repeat sidebar/chat and panel/terminal checks in light and high-contrast themes | Text, borders, controls, and terminal remain readable | Not run |
| 40 | Surface disable/restore | Deselect sidebar and panel, then disable Workspace Colors | Original values return; unrelated and externally changed keys survive | Not run manually; automated ownership tests pass |

Notes:
- Do not use a live personal profile for scenarios 15/16/18/19/20 destructive checks; use an isolated
  test profile/fixture per the design's blast-radius constraints.
- Record only sanitized observations here (no personal data, tokens, or paths outside the fixture).
