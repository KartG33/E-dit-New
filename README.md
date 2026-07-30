# E-dit

E-dit is a two-pane text editor with text transformations, presets, history, and Suno-specific tools.

## Interface foundation

The interface uses a shared dark visual system defined in `src/index.css`. Semantic component classes draw from one set of surface, border, text, accent, spacing, and radius tokens. Editor content uses a 15 px monospace face with a 1.55 line height; controls, headings, metadata, and statistics use distinct compact hierarchy levels while preserving the existing two-pane layout.

Each editor header shows total characters including whitespace and line count. Detected special-symbol buttons remain in the footer; clicking one removes every occurrence of that token in a single editor update.

## Suno tags

The Suno section lists every bracketed tag from the active editor in text order. Tags opens as a full-height workspace in the opposite editor pane, keeping the active text visible. A selected occurrence can be renamed or deleted as one Undo step. The builder inserts predefined or custom tags on their own line and can add a positive section number to predefined section tags.

## Development

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
