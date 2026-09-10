# E-dit 2

[![CI](https://github.com/KartG33/E-dit-New/actions/workflows/ci.yml/badge.svg)](https://github.com/KartG33/E-dit-New/actions/workflows/ci.yml)

Редактор текста для **Windows и Android** с двумя независимыми рабочими областями, преобразованиями текста и инструментами для Suno. Тексты, настройки, история и пресеты хранятся локально.

## Возможности

- Один или два редактора, независимые Undo/Redo, автосохранение и восстановление незавершённой записи.
- Команды обработки текста и составные пресеты из команд, замен и удаления фрагментов.
- Поиск в тексте и истории, переход к Suno-тегу, копирование в другой редактор.
- Настраиваемые горячие клавиши с проверкой конфликтов и подсказками при наведении.
- Импорт и экспорт Data v3; поддержка старых файлов Data v2.
- Независимые интерфейсы Desktop и Android с общей логикой обработки текста.

Версия: **2.0.6**. Подробности — в [истории изменений](CHANGELOG.md) и [руководстве по возможностям](docs/usage.md).

## Быстрый запуск

Нужен Node.js 22 LTS (от 22.13) и npm.

```sh
git clone https://github.com/KartG33/E-dit-New.git
cd E-dit-New
npm ci
npm run dev:desktop
# или отдельно:
npm run dev:android
```

Браузер используется только для предпросмотра выбранного приложения: Desktop на порту 5173, Android на 5174.

`npm run build:desktop` и `npm run build:android` готовят только файлы соответствующего интерфейса в `dist/desktop` и `dist/android`. Они не собирают установщик или APK. Для проверки границ кода: `npm run check:boundaries`; для полной проверки проекта: `npm run check`.

## Документация

- [Окружение, тесты и сборки Windows / Android](docs/development.md)
- [Устройство проекта и хранение данных](docs/architecture.md)
- [Правила внесения изменений](CONTRIBUTING.md)
- [Проверка реализации 2.0.6](docs/reports/verification-2.0.6.md)
- [Аудит репозитория](docs/reports/repository-audit-2026-09-08.md)
- [Все документы и архив завершённых этапов](docs/README.md)

GitHub Actions проверяет оба интерфейса, собирает Windows NSIS и Android debug APK. Сборки доступны в артефактах успешного запуска [CI](https://github.com/KartG33/E-dit-New/actions/workflows/ci.yml) в течение 7 дней. Они не заменяют подписанный релиз и проверку установленного приложения.

В основе проекта — React, TypeScript, Vite и Dexie; Windows использует Tauri, Android — Capacitor. Исходники и lock-файлы хранятся в Git, локальные сборки и ключи подписи исключены.
