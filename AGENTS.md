# AGENTS.md — работа над Malewich

Этот файл — краткий операционный контракт для coding-агентов. Мотивация архитектурных решений и история ошибок находятся в [docs/DEVELOPMENT_HISTORY.md](docs/DEVELOPMENT_HISTORY.md). Читайте её перед изменением renderer, документной модели, Figma import или страниц.

## Проект

Malewich — однопользовательский браузерный редактор интерфейсов. Стек: React 19, TypeScript, Vite 6, Zustand 5, PixiJS 8, Vitest и Playwright. Интерфейс и пользовательская документация — на русском; код и технические идентификаторы — на английском.

Приложение не требует backend. Документы сохраняются в IndexedDB, небольшие резервные копии — в localStorage. Не добавляйте сетевые зависимости для базового редактирования.

## Команды

```bash
npm install
npm run dev
npm test -- --run
npm run build
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npm run test:e2e
```

При отсутствии локального Chromium сначала выполните `npx playwright install chromium`, затем используйте обычный `npm run test:e2e` без переменной окружения.

Перед завершением изменения запускайте unit-тесты и production build. Для UI, renderer, импорта и документной модели запускайте полный browser suite, а не только новый сценарий.

## Карта

- `src/types.ts` — сериализуемая модель документа, страницы, фон, legacy group metadata и узлы.
- `src/store/editorStore.ts` — полный документ всех страниц, команды, history, transient updates.
- `src/utils/document.ts` — иерархия, абсолютная геометрия, WeakMap-индексы.
- `src/utils/pages.ts` — страницы и производный документ активной страницы.
- `src/hooks/usePageDocument.ts` — активная страница для React-компонентов.
- `src/components/EditorCanvas.tsx` — input, hit-test, transforms, snapping.
- `src/components/PixiScene.tsx` — retained WebGL renderer и compositor preview.
- `src/components/SceneNode.tsx` — SVG fallback и эталонная SVG-визуализация.
- `src/components/LayersPanel.tsx` / `PagesPanel.tsx` — слои и плоский список страниц; группы существуют только как legacy metadata.
- `src/utils/figmaImport.ts` — граница Figma decoder и конвертация модели.
- `src/utils/export.ts` — SVG/PNG/JSON.
- `src/utils/storage.ts` — текущие IndexedDB и localStorage форматы Malewich.
- `e2e/fixtures/TCB.PAY.fig` — реальный регрессионный fixture; не заменять без необходимости.
- `.fig-import/` — локальные исследования и профили, не публикуются.

## Нефункциональные инварианты

### Документ и страницы

- `state.doc` содержит **все страницы**. Не заменяйте его производным `getPageDocument()` в командах сохранения или history.
- Для no-op history используйте identity и `isDocumentContentEqual()` с ранним выходом, а не полный `JSON.stringify` документа. Сериализация остаётся только для storage/export.
- `pageId` обязателен только у корневых слоёв; descendants определяют страницу через предков. Не дублируйте его на каждом узле без необходимости.
- Canvas, layers, hit-test, snapping, fit, export и Presentation работают с активной страницей. Component library и persistence могут работать со всем документом. `getPageDocument()` делит immutable projection между компонентами через WeakMap по документу и `pageId`; не мутируйте исходный документ или projection на месте.
- Старые документы без `pages`/`pageId` трактуются как одна `page-1`; миграция не должна ломать существующие JSON.
- Переключение страницы очищает selection и вписывает её содержимое в viewport. Локальная подсветка строки страницы показывается до тяжёлой смены активной сцены; быстрые повторные клики отменяют устаревшие отложенные переключения. Группы страниц — только legacy metadata, не иерархический frame и не элемент текущего UI; удаление группы страниц не удаляет страницы. Объектные группы — отдельный случай: это прозрачные frame-узлы с `isGroup`, а не page groups.
- `PageDefinition.background` относится только к своей странице. Тема меняет default фон, но не перезаписывает явно выбранный цвет.
- Новые корни получают активную страницу через store pipeline. Сохраняйте это при добавлении новых способов создания/копирования узлов.

### Геометрия и editing

- Координаты узлов абсолютные в page-space. При перемещении родителя потомки получают тот же мировой delta ровно один раз.
- Auto Layout использует parent-relative геометрию. Не применяйте быстрый `preserveRelativeGeometry` путь к перемещению ребёнка внутри Auto Layout.
- Сохраняйте clipping, masks, transforms и z-order. `flipX`/`flipY` участвуют в общей affine matrix, Pixi container scale, SVG/export и hit-test. Не выводите nested frame в compositor overlay без учёта предков.
- Selection handles, labels и text editor остаются в SVG; canvas dots не должны перекрывать объекты или UI.
- Не меняйте поведение frame labels только из-за видимого дублирования: в импортированном макете могут быть собственные текстовые подписи.

### Renderer и производительность

- Renderer — PixiJS/WebGL с retained display objects и ручным `app.render()`, без постоянного ticker. Асинхронные image/editing/resize invalidations коалесцируются в один rAF; resize не debounce.
- Чистый translation переиспользует visuals; не пересоздавайте текстуры и Graphics всего поддерева на каждый pointermove. Посещённые страницы хранят retained worlds и очищаются при смене документа; неизменённый viewport повторно не рисуется.
- Не возвращайте RenderTexture-кэш корня. При простом root drag `state.doc` остаётся immutable до release: существующее поддерево и selection получают общий deferred compositor delta, а document commit/history выполняются один раз. Nested, Auto Layout и reparenting не переводите на этот путь без учёта предков.
- `DocumentChange` передаёт изменённые/deleted IDs, свойства и структурный признак; renderer не сканирует sibling order при обычном edit. Auto Layout и component sync возвращают прежние object references при равных значениях. Чистый X/Y translation main component не должен запускать component reconciliation или менять identities/геометрию instances.
- Layers строит плоский список по `(document, page, collapsed)` и создаёт DOM только для видимых строк с overscan. Не возвращайте полное рекурсивное DOM-дерево или рекурсивное сравнение поддеревьев. Мемоизация строк обязана пропускать transform-only изменения, но propagate display-изменения потомков и collapsed/renaming контекст.
- Изменения nested transforms проверяйте pixel-сравнением incremental результата с полным rebuild после reload.
- Сначала профилируйте реальный жест. Убедитесь, что цель видима, действительно выбрана и координата изменилась. Auto Layout может законно вернуть позицию ребёнка.
- `data-render-ms` не включает всю нативную/software-WebGL растеризацию; CDP `(program)` тоже учитывайте.
- Zoom выполняется через немедленный compositor preview и один финальный WebGL render после 90 мс паузы. Text measurement/wrapping и Pixi fragment measurements кэшируются отдельно от raster resolution и инвалидируются по font generation. Разрешение retained `Text` синхронизируется с zoom/DPR только у видимых объектов; длинные строки, не помещающиеся в GPU texture limit, делятся на retained-фрагменты. Не возвращайте общий предел 8× и не растрируйте весь длинный текст на 25 600% целиком. Максимальный zoom — `MAX_ZOOM = 256` (25 600%).
- Low-detail текст допустим только как transient drag preview при zoom ≤ 50%; release обязан вернуть полный кадр. Изображения используют общий bounded LRU с display/DPR buckets и не вытесняют активные textures; export не зависит от уменьшенной canvas-копии.
- Vector fill использует `vectorFillPaths()` для outer+hole groups по winding; не возвращайтесь к ограниченному Pixi SVG parser, который теряет `nonzero` holes. Pixel-проверки крайнего zoom должны наводиться на заведомо закрашенную точку, а не на середину text bounds, где может быть межбуквенный пробел.

### Figma import

- Поддерживаемая визуальная модель описана в README. Не заявляйте полную Figma parity.
- Solid paints, абсолютная геометрия, editable text/vector, Auto Layout, components, variables, видимые страницы и embedded `FILL`/`STRETCH` images на листовых frame/rectangle shapes — основной проверенный контур.
- Gradients, произвольные image fills вне этого случая, `CROP`/`TILE`, effects, masks и mixed text runs не считаются полностью поддержанными.
- `graph.getAbsolutePosition()` уже включает rotation/flip. Не копируйте его вместе с flags в absolute layout model: суммируйте нетрансформированные translations и согласовывайте порядок flip → rotation с общей matrix, иначе иллюстрации и clipping сместятся.
- Expanded `strokeGeometry` не обводится повторно. Vector SVG/export должен нести собственные paint attributes; прозрачные paints не создают Pixi draw instructions.
- При отсутствии derived geometry используйте `vectorNetwork`, а не rectangle fallback. `isMask` — editable metadata, mask-контур не должен становиться обычной видимой заливкой; полный mask compositing отдельно не заявлен.
- Видимые Figma-страницы сохраняются раздельно в исходных coordinate spaces; не сдвигайте их горизонтально друг относительно друга. Internal Only Canvas пропускается.
- Используйте реальные `TCB.PAY.fig`, `TCB.PAY.SMZ.fig` и community fixtures UI Prep/Globbb; не меняйте сохранённую геометрию глобальным reflow при открытии.

### UI и Dev Mode

- Toolbar не перестраивайте без прямого запроса.
- Frame/Auto Layout и Main Component/Instance должны визуально различаться и в слоях, и в инспекторе.
- Selection в canvas раскрывает и прокручивает дерево, но не закрывает вкладку библиотеки.
- Тема меняет интерфейс, не цвета макета. Workspace не имеет верхней/нижней панелей: project/panel/zoom controls находятся слева, undo/redo/presentation/theme — справа; Export работает только для selection в Inspector. `Cmd/Ctrl+\\` скрывает боковые панели, tool rail и canvas hint через `hidden`/CSS без размонтирования; ResizeObserver явно resize-ит оба renderer и восстанавливает WebGL после изменения ширины, а pixel/hit-target regression обязателен.
- Подсветка CSS строится React-токенами; не используйте `dangerouslySetInnerHTML` для generated code.

## Тесты и регрессии

Базовый снимок содержит 67 unit-тестов и 44 browser-сценария; текущий контур после DocumentChange, виртуализации Layers, text layout cache, transient LOD, image buckets, SMZ, vector/mask, page/UI, extreme zoom/nonzero rendering, text tiling, object operations/export, deferred root labels, component/layer optimizations, branding, canvas-only exposed-pixel и community import regressions — 96 и 58 соответственно. При добавлении тестов обновляйте документацию с фактическими числами.

Обязательные специальные проверки:

- TCB.PAY import/reload и non-blank canvas; TCB.PAY.SMZ second page + Presentation;
- UI Prep SVG/WebGL images + Inter + fit/reload; Globbb reflected world transforms и known-pixel brain/arm;
- Canvas Control-click menu не должен ломать Cmd/Ctrl+primary deep-select;
- nested move incremental vs rebuild pixel equality;
- изоляция двух страниц с одинаковыми координатами;
- component/Auto Layout identity;
- selection scroll into view;
- Presentation выбранного экрана;
- light/dark UI и `Cmd/Ctrl+\\`;
- CSS token reconstruction (`tokens.join('') === source`).

Добавляйте тест на исправленное поведение. Не ослабляйте старые assertions ради прохождения; сначала выясните, является ли новое поведение намеренным.

## Документация и Git

- Пользовательские возможности — в `README.md`.
- Заметные изменения — в `CHANGELOG.md` под `Unreleased`.
- UX-контур — в `UX_AUDIT.md`.
- Причины архитектурных решений — в `docs/DEVELOPMENT_HISTORY.md`, не превращайте его в список ежедневных коммитов.
- Не коммитьте `node_modules`, `dist`, `.npm-cache`, `.playwright-browsers`, `test-results`, `.fig-import`, `.env` или логи.
- Для новых изменений используйте Conventional Commits: `feat:`, `fix:`, `perf:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Не меняйте публичную историю и не делайте force push без прямого запроса.
