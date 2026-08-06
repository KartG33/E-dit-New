# E-dit

E-dit is a two-pane text editor with text transformations, presets, history, and Suno-specific tools.

## Interface foundation

The interface uses a shared dark visual system defined in `src/index.css`. Semantic component classes draw from one set of surface, border, text, accent, spacing, and radius tokens. Editor content uses a 15 px monospace face with a 1.55 line height; controls, headings, metadata, and statistics use distinct compact hierarchy levels while preserving the existing two-pane layout.

Each editor header shows total characters including whitespace and line count. Detected special-symbol buttons remain in the footer; clicking one removes every occurrence of that token in a single editor update.

## Suno tags

The Suno section lists every bracketed tag from the active editor in text order. Tags opens as a full-height workspace in the opposite editor pane, keeping the active text visible. A selected occurrence can be renamed or deleted as one Undo step. The builder inserts predefined or custom tags on their own line and can add a positive section number to predefined section tags.

## Presets

The Presets command tab contains only quick-apply buttons. Preset creation and maintenance opens from the separate Presets action beside History and Data. The manager supports ordered command sequences, symbol-removal steps, and find/replace presets, including editing, ordering, validation, and confirmed deletion. Changes appear in the quick-apply toolbar immediately.

## Data files

Data export and import use the browser file workflow in the web version and native open/save dialogs in the Tauri desktop version. On Android, Import opens the system file picker, while Export opens the native save/share sheet using a temporary cache file that is removed afterward. All platforms use the same validated Data v2 format and atomic import logic.

## Android app behavior

The Android WebView resizes with the software keyboard. The system Back button hides the keyboard first, returns the mobile preset editor to its list, closes an open auxiliary window, or minimizes the app from the main screen. Pending changes in both editors are flushed before the app moves to the background, and viewport measurements refresh when it returns. Capacitor SystemBars provides safe-area values so portrait and landscape controls stay clear of Android's edge-to-edge system UI.

## App icons

Platform-ready source assets live in `icons/`. The web build uses the favicon, Apple Touch, standard PWA, and maskable icons from `public/icons/`; the Tauri bundle uses the generated desktop and store assets from `src-tauri/icons/`; Android uses density-specific launcher and adaptive resources under `android/app/src/main/res/`.

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

Sync the production web build into the Capacitor Android project:

```text
npm run android:sync
```

Open the native project after installing Android Studio 2025.2.1 or newer and an Android SDK. Capacitor 8 Android builds require JDK 21; use the JDK bundled with Android Studio if the system `JAVA_HOME` points to an older Java installation:

```text
npm run android:open
```

The Android shell targets API 24 and newer. Build the debug APK with JDK 21 after synchronizing the web assets:

```text
.\android\gradlew.bat -p android assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

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
