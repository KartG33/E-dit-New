# Запуск, проверки и сборка

## Окружение

- Node.js 22 LTS, не ниже 22.13; ветка закреплена в `.node-version`. Также допускается Node.js 24. Используйте npm и `package-lock.json`.
- Windows: Rust stable (MSVC), Visual Studio Build Tools с компонентами C++ и WebView2 для Tauri.
- Android: JDK 21, Android SDK Platform 36 и Android SDK Build Tools. Путь SDK задаётся через `ANDROID_HOME` либо локальный `android/local.properties`, путь JDK — через `JAVA_HOME`.

```sh
npm ci
npm run dev:desktop
# Android: npm run dev:android
```

На Windows, если PowerShell блокирует `npm.ps1`, используйте `npm.cmd` вместо `npm`. Не нужно изменять системную политику выполнения скриптов.

## Проверки

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` проверяет границы зависимостей, совпадение версий платформ, линтер, строгий TypeScript и весь набор Vitest в одном thread worker. Такой режим уменьшает расход памяти и конкуренцию тестов за ресурсы. Для наблюдения за тестами используйте `npm run test:watch`.

E2E собирает два отдельных предпросмотра и запускает серверы Desktop на `127.0.0.1:4173` и Android на `127.0.0.1:4174`. Нативные файловые операции заменяются браузерными только в предпросмотрах. Playwright управляет его запуском и остановкой и отказывается использовать занятый порт. На Linux при отсутствии системных библиотек выполните `npx playwright install --with-deps chromium`. Диагностика неуспешных сценариев попадает в `test-results/` и, в CI, `playwright-report/`.

Старая команда `npm run test:phase6:e2e` остаётся совместимым псевдонимом. Замеры производительности: `npm run bench:phase5`; они не входят в обычный набор тестов.

## Windows

Выполняйте в Windows с установленными инструментами Tauri:

```sh
npm run tauri dev
npm run build:windows
```

`build:windows` собирает NSIS-установщик и использует `Cargo.lock` с `--locked`. Выходной каталог: `src-tauri/target/release/bundle/nsis/`. Обычная команда `npm run tauri build` использует все настроенные форматы, в том числе MSI, которому нужен рабочий WiX.

## Android

```sh
npm run android:sync
```

Затем в Windows:

```powershell
.\android\gradlew.bat -p android testDebugUnitTest assembleDebug
```

Или в Linux:

```sh
./android/gradlew -p android testDebugUnitTest assembleDebug
```

`android:sync` сначала собирает web-ресурсы, затем копирует их в нативный проект. Перед каждой Android-сборкой после изменения интерфейса повторяйте синхронизацию. APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

Команды сборки и JVM-тестов не подключают устройства. Debug APK не является подписанным production-релизом. Ключи выпуска должны храниться вне Git.

## Версии и зависимости

Версия приложения согласуется в `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` и `android/app/build.gradle`. При выпуске новой версии также увеличьте Android `versionCode`. Команда `npm run check:versions` обнаруживает несовпадение текстовых версий.

Обновляйте зависимости отдельным изменением, изучайте `npm audit` и выполняйте проверки. Не применяйте `npm audit fix --force` без проверки совместимости. Текущее состояние зависимостей и ограничения зафиксированы в [аудите репозитория](reports/repository-audit-2026-09-08.md).

## GitHub Actions

На push в `main` и pull request выполняются три задания: web-проверки и Chromium E2E, сборка Windows NSIS, Android JVM-тесты и сборка debug APK. Их также можно запустить вручную. Пакеты хранятся как Actions artifacts 7 дней. Задания имеют только чтение содержимого репозитория; публикация релиза и установка приложения не выполняются.

Используются официальные [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [setup-java](https://github.com/actions/setup-java) и [upload-artifact](https://github.com/actions/upload-artifact), закреплённые по SHA коммита.
