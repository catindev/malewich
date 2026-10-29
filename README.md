# Malewich

Браузерный визуальный редактор интерфейсов на React и TypeScript. Проект работает без сервера: документ и изображения автоматически сохраняются в IndexedDB текущего браузера, с резервной копией небольших документов в `localStorage`.

## Запуск

```bash
git clone https://github.com/catindev/malewich.git
cd malewich
npm install
npm run dev
```

Откройте адрес, который покажет Vite (по умолчанию `http://localhost:5173`). Для браузерных тестов один раз установите Chromium командой `npx playwright install chromium`.

```bash
npm run build    # production-сборка в dist/
npm test         # модульные тесты
npm run test:e2e # браузерные сценарии (нужен Playwright Chromium)
npm run preview  # просмотр production-сборки
```

В этом checkout Chromium установлен локально, поэтому browser-тесты запускаются так:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:e2e
```

## Документация

- [CHANGELOG.md](CHANGELOG.md) — пользовательские изменения по версиям.
- [AGENTS.md](AGENTS.md) — команды, границы и инварианты для coding-агентов.
- [История разработки и архитектурных решений](docs/DEVELOPMENT_HISTORY.md) — этапы, альтернативы, ошибки и причины ключевых решений.
- [UX_AUDIT.md](UX_AUDIT.md) — поведение относительно Figma и регрессионный контур.

Репозиторий: <https://github.com/catindev/malewich>.

## Импорт Figma

Меню проекта → **«Открыть .fig / JSON…»** принимает локальный `.fig`, `.malewich.json`, обычный `.json` и старый `.forma.json`.

- Бинарный `fig-kiwi` декодируется через `@open-pencil/fig`; не требуется Figma API или доступ к облаку.
- Фреймы, группы, компоненты, instances, текст, фигуры и векторы преобразуются в отдельные редактируемые слои, а не в плоский screenshot.
- Сохраняются иерархия, абсолютная геометрия, solid fill/stroke, inside stroke, SVG contours с fill-rule, Auto Layout, Fixed/Hug/Fill, component links/overrides, переменные, коллекции, modes и bindings. Уже развёрнутый Figma `strokeGeometry` заливается цветом обводки без повторного stroke.
- Manrope поставляется локально через `@fontsource/manrope`, поэтому импортированная типографика не зависит от системных шрифтов.
- При открытии сохранённая геометрия не пересчитывается глобально. Последующий edit пересчитывает Auto Layout только в изменённой ветке и связанных instances.
- Видимые Figma-страницы становятся отдельными страницами Malewich с собственными корневыми слоями и именами. Internal Only Canvas не импортируется.

Проверка на реальном `TCB.PAY.fig`: **2 325 слоёв**, включая **599 текстов**, **671 редактируемый vector**, **691 Auto Layout-контейнер**, **26 main components**, **176 instances**, **122 переменные** и **6 коллекций**. Browser-тест проверяет отображение, component inspector и сохранение после reload.

Текущий converter рассчитан на solid paints. Gradient/image fills, маски, effects, смешанные text runs и полноценные Variant sets из произвольных файлов остаются следующим этапом; в проверенном TCB.PAY они не используются. Это не заявление о полной визуальной совместимости со всеми Figma-файлами.

## Возможности

- несколько независимых страниц: создание, переключение, переименование, дублирование и удаление;
- группы страниц с переименованием, сворачиванием и drag-and-drop страниц между группами;
- Figma-like обозначения Frame, направления Auto Layout, Main Component и Instance в слоях и инспекторе;
- синхронизация выделения с деревом слоёв: раскрытие предков и автоматический scroll into view;
- светлая и тёмная темы интерфейса, скрытие боковых панелей по `⌘\` / `Ctrl+\`;
- фреймы с вложенными объектами и обрезкой содержимого;
- Auto Layout: direction, gap, padding, alignment, justify, Hug/Fixed/Fill по осям, min/max и Absolute position;
- компоненты с instances, синхронизацией, overrides, reset, detach и Variants;
- цветовые и текстовые стили с обновлением связанных объектов;
- цветовые и числовые переменные, коллекции, Light/Dark modes и aliases;
- библиотека с поиском и drag-and-drop компонентов на холст;
- Prototype-переходы с интерактивным предпросмотром и историей;
- Dev Mode с генерацией CSS, токенами и подсветкой синтаксиса;
- прямоугольники, эллипсы, текст, локальные изображения и SVG vector layers;
- иерархическое и marquee-выделение, deep-select и множественный выбор;
- перемещение и resize со smart guides, сохранение пропорций и вращение;
- групповые resize/rotate, выравнивание и распределение объектов;
- редактирование текста по double-click с одной рамкой поля, auto-width, auto-height и fixed-size;
- заливка, обводка, непрозрачность, скругление и настройки типографики;
- скрытие, блокировка, переименование и drag-and-drop слоёв;
- перенос объектов между фреймами с сохранением координат;
- Undo/Redo, дублирование, Alt-drag и внутренний copy/cut/paste;
- перемещение стрелками, zoom, pan, fit-to-screen и fit-to-selection;
- автосохранение в IndexedDB, новый проект, импорт `.fig` и импорт/экспорт JSON;
- контекстное меню по правому клику на холсте и объектах;
- экспорт выбранного объекта или всего макета в PNG и SVG.

## Хранение и переименование Forma → Malewich

Текущие ключи: IndexedDB `malewich-editor`, localStorage `malewich:document:v1`, экспорт `*.malewich.json`. При первом открытии Malewich читает старые `forma-editor` и `forma:document:v1` и переносит документ в новое хранилище. Старые `.forma.json` можно открыть через то же меню.

## Горячие клавиши

| Действие | Клавиши |
| --- | --- |
| Выделение / рука | `V` / `H` |
| Фрейм / прямоугольник / эллипс | `F` / `R` / `O` |
| Текст / изображение | `T` / `I` |
| Отменить / повторить | `⌘Z` / `⇧⌘Z` |
| Дублировать / дублировать перетаскиванием | `⌘D` / `Alt+drag` |
| Копировать / вырезать / вставить | `⌘C` / `⌘X` / `⌘V` |
| Переместить на 1 px / 10 px | `стрелки` / `Shift+стрелки` |
| Удалить | `Delete` или `Backspace` |
| Временно включить руку | удерживать `Space` |
| Сохранить пропорции / ограничить ось | удерживать `Shift` |
| Порядок слоя | `[` / `]` |
| Масштаб 100% / вписать макет / вписать выделение | `0` / `⇧1` / `⇧2` |
| Скрыть / показать боковые панели | `⌘\` / `Ctrl+\` |

На Windows и Linux вместо `⌘` используйте `Ctrl`. Буквенные команды и цифры обрабатываются через физические коды клавиш, поэтому работают и в русской раскладке. Найденные UX-расхождения и исправления описаны в [UX_AUDIT.md](UX_AUDIT.md).

## Архитектура

- `src/types.ts` — сериализуемая модель документа и vector layers;
- `src/store/editorStore.ts` — состояние, команды, история и определение changed layout scope;
- `src/utils/figmaImport.ts` — decoder boundary и преобразование Figma SceneGraph в документ Malewich;
- `src/utils/document.ts` — операции с иерархией объектов;
- `src/utils/pages.ts` и `src/components/PagesPanel.tsx` — страницы, группы и производный документ активной страницы;
- `src/utils/geometry.ts` — аффинные преобразования;
- `src/utils/groupTransform.ts` — групповые трансформации и выравнивание;
- `src/utils/autoLayout.ts` — итеративный layout с Hug/Fixed/Fill, constraints и scoped reflow;
- `src/utils/components.ts` — main/instance reconciliation, overrides и Variants;
- `src/utils/library.ts` — стили, переменные, коллекции, modes и aliases;
- `src/utils/devMode.ts` — генерация CSS и токенов;
- `src/utils/text.ts` — единый text layout для холста и экспорта;
- `src/components/EditorCanvas.tsx` — инструменты и pointer-взаимодействия;
- `src/components/PixiScene.tsx` — retained WebGL-сцена, incremental updates и on-demand rendering;
- `src/components/SceneNode.tsx` — SVG-рендерер для диагностического fallback и экспорта;
- `src/components/HitLayer.tsx` — прозрачные SVG hit targets, включаемые только для тестов;
- `src/utils/export.ts` — SVG/PNG/JSON;
- `src/utils/storage.ts` — IndexedDB, localStorage fallback и миграция Forma;
- `e2e/figmaImport.spec.ts` и `src/utils/figmaImport.test.ts` — регрессии на настоящем TCB.PAY.

Основной холст использует **PixiJS 8 / WebGL**. Для каждого слоя сохраняется display object: чистое перемещение сдвигает retained visuals и нормализует transforms без пересоздания текстур или двойного сдвига вложенных абсолютных координат; изменение геометрии и стиля пересоздаёт только затронутый visual. Рендер выполняется по требованию через `app.render()`, без постоянного ticker. При pan рукой готовый canvas временно двигается композитором через `translate3d()`, а окончательный WebGL-кадр рисуется один раз при отпускании.

При перемещении корневого фрейма его существующее Pixi-поддерево на время жеста переносится в отдельный прозрачный canvas и двигается композитором. Промежуточные pointer steps не растрируют сцену; при отпускании поддерево возвращается в основную сцену и рендерится окончательный кадр. RenderTexture-кэш корня не используется. Для вложенных фреймов сохраняется обычный WebGL-путь, чтобы не потерять clipping и transforms предков.

Горячие обходы документа используют `WeakMap`-индексы узлов, детей и descendants. Snap bounds вычисляются один раз на начало drag. Если перемещение сохраняет всю parent-relative геометрию и не затрагивает main components, preview не запускает повторно variables, component reconciliation и Auto Layout; обычный commit и вложенный Auto Layout сохраняют полный pipeline. В самом Auto Layout повторные `filter/find` по всему документу заменены индексами текущего pass.

SVG остаётся для selection handles, подписей фреймов, текстового редактора и экспорта. `?renderer=svg` включает полный SVG fallback для визуальной диагностики, `?hitLayer=1` добавляет прозрачные hit targets для legacy browser-тестов. В production hit-test выполняется по геометрии документа, без DOM-элемента на каждый слой. Figma decoder загружается как отдельный lazy chunk только при импорте `.fig`.

### Замер TCB.PAY

Headless Chromium, viewport 1440×960, 2 325 слоёв; сравнение с прежним SVG-рендерером на том же сценарии:

| Метрика | SVG | WebGL + compositor pan |
| --- | ---: | ---: |
| DOM-элементов после импорта | 54 126 | 1 196 |
| Выбор фрейма | 817 мс | 100 мс |
| Pan из 12 pointer steps | 2 625 мс | 642 мс |

Отдельный профиль реального перемещения корневого фрейма на 100% zoom, 12 pointer steps:

| Режим | До оптимизации | После |
| --- | ---: | ---: |
| Диагностический `?hitLayer=1` | 18 039 мс | 2 729 мс |
| Обычный production interaction path | — | 2 341 мс |
| Перемещение корневого текстового слоя, обычный путь | — | 538 мс |

Общее время frame drag включает обязательную отрисовку статичной сцены и moving preview при старте, а также финальный WebGL-кадр. Между ними используется композитор; в проверенном жесте transform preview равен `translate3d(80px, 30px, 0px)`.

Это диагностические замеры в headless Chromium с software WebGL, а не обещание одинакового времени на любом GPU. `data-render-ms` на `.pixi-scene` измеряет только вызов `app.render()` и не включает всю нативную растеризацию. Browser-тест также проверяет реальные non-blank pixels canvas, compositor transform и совпадение финального nested move с полным rebuild после reload.

### Приёмы из OpenPencil

Изучен [OpenPencil](https://github.com/open-pencil/open-pencil), прежде всего его CanvasKit renderer, node preview и разделение `renderVersion`/`sceneVersion`. В Malewich перенесены принципы дешёвого transient preview, отложенного commit и раздельной инвалидации геометрии и полной сцены. Сам renderer остаётся на PixiJS: CanvasKit/Skia WASM, WebGPU и Yoga WASM не добавлялись, а tile scheduler OpenPencil не копировался без соответствующей tile-архитектуры.

## Ограничения

Проект однопользовательский и хранится только в текущем браузере. Основное хранилище — IndexedDB; если браузер блокирует его, используется `localStorage` с его квотой. Перед очисткой данных браузера экспортируйте резервную копию JSON. Hotspots, production code export, облачная библиотека, совместная работа и редактирование отдельных узлов векторного контура относятся к следующим этапам.
