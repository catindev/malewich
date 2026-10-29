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

- `src/types.ts` — сериализуемая модель документа, страницы, группы и узлы.
- `src/store/editorStore.ts` — полный документ всех страниц, команды, history, transient updates.
- `src/utils/document.ts` — иерархия, абсолютная геометрия, WeakMap-индексы.
- `src/utils/pages.ts` — страницы и производный документ активной страницы.
- `src/hooks/usePageDocument.ts` — активная страница для React-компонентов.
- `src/components/EditorCanvas.tsx` — input, hit-test, transforms, snapping.
- `src/components/PixiScene.tsx` — retained WebGL renderer и compositor preview.
- `src/components/SceneNode.tsx` — SVG fallback и эталонная SVG-визуализация.
- `src/components/LayersPanel.tsx` / `PagesPanel.tsx` — слои, страницы и группы.
- `src/utils/figmaImport.ts` — граница Figma decoder и конвертация модели.
- `src/utils/export.ts` — SVG/PNG/JSON.
- `src/utils/storage.ts` — persistence и Forma → Malewich migration.
- `e2e/fixtures/TCB.PAY.fig` — реальный регрессионный fixture; не заменять без необходимости.
- `.fig-import/` — локальные исследования и профили, не публикуются.

## Нефункциональные инварианты

### Документ и страницы

- `state.doc` содержит **все страницы**. Не заменяйте его производным `getPageDocument()` в командах сохранения или history.
- `pageId` обязателен только у корневых слоёв; descendants определяют страницу через предков. Не дублируйте его на каждом узле без необходимости.
- Canvas, layers, hit-test, snapping, fit, export и Presentation работают с активной страницей. Component library и persistence могут работать со всем документом.
- Старые документы без `pages`/`pageId` трактуются как одна `page-1`; миграция не должна ломать существующие JSON.
- Переключение страницы очищает selection. Группа страниц — metadata, не иерархический frame; удаление группы не удаляет страницы.
- Новые корни получают активную страницу через store pipeline. Сохраняйте это при добавлении новых способов создания/копирования узлов.

### Геометрия и editing

- Координаты узлов абсолютные в page-space. При перемещении родителя потомки получают тот же мировой delta ровно один раз.
- Auto Layout использует parent-relative геометрию. Не применяйте быстрый `preserveRelativeGeometry` путь к перемещению ребёнка внутри Auto Layout.
- Сохраняйте clipping, masks, transforms и z-order. Не выводите nested frame в compositor overlay без учёта предков.
- Selection handles, labels и text editor остаются в SVG; canvas dots не должны перекрывать объекты или UI.
- Не меняйте поведение frame labels только из-за видимого дублирования: в импортированном макете могут быть собственные текстовые подписи.

### Renderer и производительность

- Renderer — PixiJS/WebGL с retained display objects и ручным `app.render()`, без постоянного ticker.
- Чистый translation переиспользует visuals; не пересоздавайте текстуры и Graphics всего поддерева на каждый pointermove.
- Не возвращайте RenderTexture-кэш корня. Transient frame drag использует существующее поддерево в отдельном canvas и финальный WebGL render.
- Изменения nested transforms проверяйте pixel-сравнением incremental результата с полным rebuild после reload.
- Сначала профилируйте реальный жест. Убедитесь, что цель видима, действительно выбрана и координата изменилась. Auto Layout может законно вернуть позицию ребёнка.
- `data-render-ms` не включает всю нативную/software-WebGL растеризацию; CDP `(program)` тоже учитывайте.

### Figma import

- Поддерживаемая визуальная модель описана в README. Не заявляйте полную Figma parity.
- Solid paints, абсолютная геометрия, editable text/vector, Auto Layout, components, variables и видимые страницы — основной проверенный контур.
- Gradients, произвольные image fills, effects, masks и mixed text runs не считаются полностью поддержанными.
- Expanded `strokeGeometry` не обводится повторно. Vector SVG должен нести собственные paint attributes.
- Видимые Figma-страницы сохраняются раздельно; Internal Only Canvas пропускается.
- Используйте реальный TCB.PAY regression и не меняйте сохранённую геометрию глобальным reflow при открытии.

### UI и Dev Mode

- Toolbar не перестраивайте без прямого запроса.
- Frame/Auto Layout и Main Component/Instance должны визуально различаться и в слоях, и в инспекторе.
- Selection в canvas раскрывает и прокручивает дерево, но не закрывает вкладку библиотеки.
- Тема меняет интерфейс, не цвета макета. `Cmd/Ctrl+\\` скрывает боковые панели, не toolbar.
- Подсветка CSS строится React-токенами; не используйте `dangerouslySetInnerHTML` для generated code.

## Тесты и регрессии

Базовый снимок содержит 67 unit-тестов и 44 browser-сценария; при добавлении тестов обновляйте документацию с фактическими числами.

Обязательные специальные проверки:

- TCB.PAY import/reload и non-blank canvas;
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
