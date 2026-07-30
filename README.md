# E-dit

E-dit is a two-pane text editor with text transformations, presets, history, and Suno-specific tools.

## Interface foundation

The interface uses a shared dark visual system defined in `src/index.css`. Semantic component classes draw from one set of surface, border, text, accent, spacing, and radius tokens. Editor content uses a 15 px monospace face with a 1.55 line height; controls, headings, metadata, and statistics use distinct compact hierarchy levels while preserving the existing two-pane layout.

Each editor header shows total characters including whitespace and line count. Detected special-symbol buttons remain in the footer; clicking one removes every occurrence of that token in a single editor update.

## Suno tags

The Suno section lists every bracketed tag from the active editor in text order. Tags opens as a full-height workspace in the opposite editor pane, keeping the active text visible. A selected occurrence can be renamed or deleted as one Undo step. The builder inserts predefined or custom tags on their own line and can add a positive section number to predefined section tags.

## Data files

Data export and import use the browser file workflow in the web version and native open/save dialogs in the Tauri desktop version. Both platforms use the same validated Data v2 format and atomic import logic.

## Development

Install dependencies:

```text
npm install
```

Run the web version:

```text
npm run dev
```

Run the desktop version:

```text
npm run tauri dev
```

Build the web version or Windows application:

```text
npm run build
npm run tauri build
```

Run project checks:

```text
npm test
npm run lint
```
