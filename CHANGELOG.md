# Changelog

Все заметные изменения Malewich документируются здесь. Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии следуют [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [0.1.0] - 2026-10-29

Первый публичный снимок Malewich — локального браузерного редактора интерфейсов.

### Добавлено

- Редактируемые фреймы, фигуры, текст, изображения и SVG-векторы с вложенной иерархией.
- Auto Layout с direction, gap, padding, alignment, justify, Hug/Fixed/Fill, min/max и Absolute position.
- Main components, instances, overrides, detach/reset и базовые Variants.
- Цветовые и текстовые стили, переменные, коллекции, modes и aliases.
- Несколько независимых страниц и групп страниц с созданием, переименованием, дублированием, удалением и drag-and-drop.
- Figma-like обозначения Frame, Auto Layout, Main Component и Instance в дереве и инспекторе.
- Синхронизация canvas selection с раскрытием и прокруткой дерева слоёв.
- Prototype-переходы, Presentation выбранного или видимого экрана и переключение экранов.
- Dev Mode с генерацией CSS, токенами и подсветкой синтаксиса.
- Светлая и тёмная темы интерфейса, скрытие боковых панелей по `Cmd/Ctrl+\\`.
- Импорт бинарных `.fig` через OpenPencil decoder, включая слои, геометрию, компоненты, переменные и видимые страницы.
- Экспорт PNG, SVG и JSON; автосохранение в IndexedDB с localStorage fallback.
- Миграция данных и файлов Forma без потери существующих проектов.
- Подробная документация архитектуры, UX-аудита, истории решений и работы для агентов.

### Производительность

- Retained PixiJS/WebGL renderer с incremental updates и on-demand rendering.
- Композиторный pan и transient preview корневого фрейма во время drag.
- Индексация документа, кэширование snap bounds и scoped Auto Layout.
- Pixel-level регрессии для вложенного перемещения и non-blank canvas после импорта.

### Проверка снимка

- 67 unit-тестов.
- 44 browser-сценария Playwright.
- Production build TypeScript/Vite.
- Реальный `TCB.PAY.fig`: 2 325 слоёв, 599 текстов, 671 vector, 691 Auto Layout, 26 main components, 176 instances, 122 переменные и 6 коллекций.
