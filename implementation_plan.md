# Phase 2 Completion Implementation Plan

## Proposed Changes

### 1. Текущее состояние редакторов
- **Constant State**: Do not rely on saved History versions to restore text. Add a typed table/settings entry for permanent editor texts: `editorLeftText: string; editorRightText: string`.
- **Hydration**: Initialize `useReducer` with a loading state, fetch texts in `useEffect`, dispatch a `HYDRATE` action.
- **Auto-save block**: Prevent auto-saving until hydration completes. Protect against overwriting saved text with an initial empty string.
- **Restart Restoration**: Both texts, active editor, and selections must restore cleanly after a restart.

### 2. История и debounce
- **No Consecutive Duplicates**: Prevent adding identical states to the Undo Stack. `EditDatabase.addHistory` independently prevents consecutive duplicate History versions and enforces the 50-record limit per editor.
- **Debounce Timer**: Set `debounceTimer.current = null` after execution.
- **Cleanup**: Save on unmount *only* if there's a pending change.
- **React StrictMode**: Defend against creating empty/duplicate records due to double-mounts.
- **Fake Timers in Tests**: Replace real timeouts with fake timers to test debounce quickly.
- **Tests for Debounce**: Ensure rapid edits, unmounting before debounce, and remounting are handled.

### 3. Выделение и горячие клавиши
- **`SET_SELECTION` Action**: Separate action in reducer that doesn't create an undo step.
- **`onSelect`**: Capture and save actual cursor position on mouse click, keyboard arrows, selection, or post-command tag insert.
- **Explicit Editor Marker**: Add `data-editor-id` to the main textarea.
- **Global Hotkeys Scope**: Hotkeys work in the main editor or interface buttons, but MUST be ignored if the active element is an external `input`, `textarea`, `select`, or `contenteditable`.

### 4. Анализ специальных символов
- **Pure Functions**: Move parsing and deletion logic to pure production functions. The hook only handles debounce.
- **Single Undo Deletion**: Text updates go through `editor.updateValue`.
- **Token Registry**: Match exactly: `---`, `...`, ` ``` `, `==`, numbered lists, punctuation, markdown chars.
- **Longest-match-first**: Ensure `...` doesn't count as three `.` tokens.
- **Compact Footer**: Both editors show only total characters including whitespace and line count on the right. Detected-token buttons display only the token while preserving remove-all behavior.
- **Tests**: Add strict counts and removal tests for overlapping tokens.

### 5. Пресеты
- **Command Registry**: `CommandId` values remain stable for stored presets, while internal function names follow the shared vocabulary: `collapseSpaces`, `trimLines`, `sunoTrim`, `toUpperCase`, and `capitalizeSunoLines`.
- **Chain Presets**: Store only stable `CommandId`. Support repeating and reordering commands. Apply chain as one undo.
- **Regex Presets**: Create/edit/delete, preview without mutating editor, display concise errors. Check `preset.data.type === 'regex'` and pass `preset.data` to applicator, no `any`.
- **Import/Schema**: Check for unknown `CommandId`. Add `order` to schema and a Dexie migration.

### 6. Favorites и startupTab
- **`AppSettings` Expansion**: Add `favoriteCommandIds`, `startupTab`, permanent editor texts, and `activeEditor`. Provide defaults and migrations.
- **Favorites logic**: Store unique `CommandId` for built-in favorites. Presets use `isFavorite`.
- **Favorites Tab**: A combined view of favorite commands and presets.
- **Startup Tab**: Pin icon in the tab button. Reads `startupTab` on app load.

### 7. Suno Tags
- **Pure Functions**: Parser and transformations independent of React.
- **Workspace**: Open the tag tools in the pane opposite the active editor without unmounting either editor.
- **Existing tags**: Show every bracketed tag from the active editor in text order without grouping or occurrence counters.
- **Editing**: Rename or delete one selected occurrence. Each operation is one Undo step.
- **Tag Builder**: Insert a predefined or custom tag on its own line. An optional `Num` for predefined section tags accepts positive integers only. Multipliers are not used.
- **Safety**: Preserve unrelated text and refuse stale or invalid edits.

### 8. History
- **History Live**: History contains saved text versions in Dexie and is shown in the right panel. Use a live-query or custom subscription to auto-update the list. Restore (loads into active), delete single, clear all (with confirmation), separate left/right records, enforce limits. Prevent cross-editor restoration. It is independent from the in-memory Undo Stack used by Undo/Redo.

### 9. Data и платформенный слой
- **Three-part data persistence**: 
  1. Creation and runtime validation of data export object.
  2. Dexie read/write transaction.
  3. UI trigger via an agnostic `DataFileAdapter`.
- **Schema & Validation**: Standardized JSON structure. Runtime schema validation (no generic type-casting). Reject missing/invalid fields, bad types, unknown versions.
- **Atomic Operations**: Perform everything inside `db.transaction('rw')`. Rollback on error. Only update UI state after successful commit.
- **Implemented for Data v2**: [src/lib/data/import.ts](src/lib/data/import.ts) validates the complete payload before a single transaction replaces settings and presets. The exported version and composition remain unchanged.
- **No File API in Component**: [DataPanel](src/components/Data/DataPanel.tsx) delegates selection, reading, and saving to the typed `DataFileAdapter` contract.
- **Current platform support**: Only `BrowserDataFileAdapter` in [dataFileAdapter.ts](src/lib/platform/dataFileAdapter.ts) is implemented. Tauri and Capacitor adapters do not exist yet and belong to future platform phases; they can implement the same contract without changing `DataPanel`.

### 10. Типизация
- Replace `Setting.value: any` with `unknown` + generic getters.
- **No `any`**: Strictly enforce zero explicit `any` and `as any` in production code. Add linting rules for explicit any.

### Command panel composition
- **Independent sections**: [CommandPanel](src/components/Commands/CommandPanel.tsx) owns navigation and shared layout, while [TextCommands](src/components/Commands/TextCommands.tsx), [SunoCommands](src/components/Commands/SunoCommands.tsx), and [PresetsCommands](src/components/Commands/PresetsCommands.tsx) own their section-specific UI and dependencies.

### 11. Тесты
- Vastly expand Vitest coverage according to the requirements, including basic commands, tokens, single-undo removals, hydration, StrictMode, hotkey ignoring, regex via `Preset.data`, History, Favorites, Suno parsing, and comprehensive data import/export validation (valid, corrupted, rollback).
- Fix `editor.test.tsx` selection test to simulate real user events.
