# Руководство по возможностям E-dit

E-dit is a two-pane text editor with text transformations, presets, history, and Suno-specific tools.

## Interface foundation

The interface uses a shared dark visual system defined in `src/index.css`. Semantic component classes draw from one set of surface, border, text, accent, spacing, and radius tokens. Editor content uses a 15 px monospace face with a 1.55 line height; controls, headings, metadata, and statistics use distinct compact hierarchy levels while preserving the existing two-pane layout.

Each editor header shows total characters including whitespace and line count. Detected special-symbol buttons remain in the footer; clicking one removes every occurrence of that token in a single editor update.

## Suno tags

The Suno section lists every bracketed tag from the active editor in text order. Tags opens as a full-height workspace in the opposite editor pane, keeping the active text visible. A selected occurrence can be renamed or deleted as one Undo step. The builder inserts predefined or custom tags on their own line and can add a positive section number to predefined section tags.

## Presets

The Presets tab applies saved actions. Open **Manage presets** in the header to create or edit them. A preset is an ordered list mixing commands, literal or regular-expression replacements, and removal of several exact fragments. Move steps with the arrows. Applying the entire preset creates one Undo step. **Duplicate preset** makes an independent saved copy with a new name and no assigned shortcut.

Existing command chains and regex presets are migrated automatically without changing their order, identifiers, shortcuts, regex flags, or replacement semantics. Literal replacements treat `$1` as text; regex replacements retain JavaScript capture-group syntax.

## Navigation and search

The layout, active editor, and last Text / Suno / Presets tab are restored on restart. Popup windows close with Escape or a click on the backdrop; a drag starting inside the window does not close it. Closing a popup restores the editor selection and scroll position.

The magnifying glass opens literal text search in the active editor. The counter and arrows navigate matches; Enter goes forward, Shift+Enter goes back, and Aa enables case sensitivity. Searching never changes text or creates an Undo entry. **Find and edit** remains a separate tool for replacements and removals.

Each tag in **Suno → Tags** has a separate **Go to tag** button. It selects that exact occurrence and scrolls it into view; on mobile, it returns to the text. Tags also works with the single-editor desktop layout.

**Copy to other editor** copies the complete source text without switching the active editor. Undo in the destination restores its previous text. History searches the full text of all saved versions, can filter by source editor, and shows dates and times. Clicking a version still restores it immediately into the active editor. Storage remains limited to 50 versions per editor.

## Keyboard shortcuts

Open **Settings → Keys** to search actions, record or clear a binding, or reset an action to its default. Text and Suno commands, presets, editor actions, tabs, and navigation can be assigned. Conflicts with another command or preset are rejected and identified by name. Shortcuts appear only in hover tooltips and shortcut settings, with no permanent badges on command buttons.

Defaults include `Alt+1` / `Alt+2` for editor selection, `Ctrl+\` for one/two editors, `Ctrl+F` for search, `Ctrl+Z` for Undo, and `Ctrl+Y` / `Ctrl+Shift+Z` for Redo. Bindings use physical key codes, so letter shortcuts work in either Latin or Cyrillic layouts. Editing a popup field does not run commands against the main text. Shortcut handling is independent of window width and only operates inside the application; Android external-keyboard behavior has not been verified on a device.

## Data and saving

Data export/import uses browser files in the web version and native open/save dialogs in Tauri. Android Import uses the system file picker; Export uses a temporary file and the native share sheet. Exports use **Data v3**, including composite presets and action shortcuts. **Data v2 imports remain supported**. Invalid steps, unsupported settings and conflicting shortcuts are rejected before the database transaction.

Editor changes are journaled immediately while the normal database save remains debounced. The next launch recovers a pending edit. Export flushes current editor changes; import waits for pending writes, applies the validated file atomically, and reloads editors and settings without a page reload. Save failures remain visible with retry. These protections cannot recover data after browser/app storage is cleared.

## Android app behavior

The WebView resizes with the software keyboard. Back hides the keyboard first, then returns from a nested Settings/preset/tag view, closes an auxiliary window, or minimizes the main screen. Pending editor changes are flushed when the app enters the background. Safe-area and viewport sizing keep the controls clear of Android system UI.

Mobile layouts and lifecycle behavior are covered by browser and automated tests. See the version-specific verification report for native testing coverage.

## App icons

Platform-ready source assets live in `icons/`. The web build uses the favicon, Apple Touch, standard PWA, and maskable icons from `public/icons/`; the Tauri bundle uses the generated desktop and store assets from `src-tauri/icons/`; Android uses density-specific launcher and adaptive resources under `android/app/src/main/res/`.
