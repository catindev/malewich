# QA backlog Malewich — 31.10.2026

Источник: сравнительная ручная проверка веб-версии с опытом Figma, ревизия `1aa5910`, и список задач QA. Полный внешний отчёт содержит 41 MW-задачу и QA01–QA02. Этот файл фиксирует рабочую приоритизацию для веб-версии и текущий статус.

## Статусы

- **DONE** — исправлено в текущем worktree и покрыто регрессией.
- **NEXT** — следующий пакет разработки после критичных исправлений.
- **PLANNED** — требуется отдельный дизайн/модель/исследование, не смешивать с быстрым polish.
- **QA** — квалификация и ручная приёмка после реализации.

## Выполнено в текущем пакете

### P0/P1 — доверие и надёжность

| ID | Статус | Результат | Регрессия |
| --- | --- | --- | --- |
| MW01 | DONE | Проектный JSON backup использует полный `state.doc`, а не active-page projection. Сохраняются все pages/nodes/definitions. | Browser: полный backup двух страниц и parent/page links. |
| MW02 | DONE | Retained renderer безопасно удаляет view без уничтожения дочерних retained containers, которые могут пережить Group → Undo/reparent. | Browser: Group → Undo, WebGL остаётся живым, page errors отсутствуют. |
| MW07 | DONE | Shape menu содержит Rectangle/Ellipse/Line/Arrow/Polygon/Star/Image и сохраняет выбранную главную иконку. Line/Arrow имеют две endpoints, нулевую высоту, точные поля и поворот вокруг start; Arrow — наконечники начала/конца, Polygon — sides, Star — points/inner radius. `L`, `Shift+L`, Shift constraints и Escape поддержаны. | Browser: length 200/stroke 10, endpoint drag с неподвижным другим концом, Undo, Escape без draft, WebGL pixel diff каждой фигуры, SVG paths/params после reload, localStorage и Image dropdown; unit: rotated endpoints, 45°, arrowheads, polygon/star и export bounds. |
| MW35 | DONE | Project/help/zoom popovers закрываются по Escape до глобального deselect. | Browser: popover Escape сохраняет selection. |
| MW36 | DONE | NumberField разделяет draft и committed value; Escape отменяет draft и блокирует последующий blur commit. | Browser: `999 → Escape` возвращает исходное значение и не создаёт изменение. |
| MW37 | DONE | Number fields не позволяют длинной подписи вытеснить число; value получает flex-пространство и остаётся читаемым. | Browser: opacity `100` видима и имеет рабочую ширину. |

## Следующий приоритет

### P1 — базовое авторинг-поведение

1. **MW03** — разделить Group/Ungroup/Frame selection; зависит от MW02.
2. **MW04–MW06** — Boolean operations, настоящий Flatten и Outline stroke; нужен единый geometry/Boolean contract.
3. **MW09–MW12** — редактируемые stroke controls, paint stack/image fill, effects и masks. Начинать с общей paint-модели, затем добавлять effects/masks.
4. **MW16** — `Shift+A` для создания Auto Layout из selection.
5. **MW18–MW20** — каноническая Fixed/Hug/Fill модель, Wrap/Grid и отрицательный gap.
6. **MW21–MW25** — полноценные variant properties, String/Boolean variables, collections/modes и field-level binding provenance.
7. **MW28** — styled text runs и paragraph editing с единым text-layout контрактом.
8. **MW29–MW30** — сохранение Grid и semantic variables/styles при FIG import.
9. **MW31** — responsive drawers для pages/layers/library/inspector на 960/800/560px.
10. **MW34** — live styles: create-and-apply, detach, reset и расширенный text-style editor.
11. **MW40** — структурированный import report: converted/omitted features, affected IDs, причины потерь и безопасная atomic replacement.
12. **MW41** — квалификация больших real FIG, p50/max cold/warm, first useful canvas, editable state, input-to-paint, memory и native rasterization.

### P2 — polish и расширение

- **MW08** — independent corner radii, arc/donut ellipse.
- **MW13–MW15** — Tidy up/distribute, repeat duplicate, frame presets/guides/constraints.
- **MW17** — visual alignment matrix и text baseline.
- **MW26–MW27** — bulk rename и системный clipboard qualification.
- **MW32** — frame labels как screen-space overlay, не зеркалить служебный текст вместе с artwork.
- **MW33** — library catalog с thumbnails, typed resources, grouping и понятным Apply.
- **MW38** — общие UI primitives, типографическая шкала, spacing, focus/hover/disabled/error states, терминология и density.
- **MW39** — полноценные prototype interactions, hotspots, easing и Smart Animate qualification.

## QA после каждого пакета

Для каждого изменения обязательны:

1. model → command → UI → Pixi/SVG/hit-test → import/export/storage → Undo;
2. unit regression на изменённый контракт;
3. полный browser suite, если затронуты UI/renderer/import/document model;
4. performance regression по релевантному baseline: compositor pan/frame drag/zoom/import, persistence и JS/React latency отдельно от native/software-WebGL;
5. проверка обеих тем, narrow widths, Escape/focus и long values;
6. обновление [README.md](../README.md), [CHANGELOG.md](../CHANGELOG.md), [UX_AUDIT.md](../UX_AUDIT.md) и [docs/DEVELOPMENT_HISTORY.md](DEVELOPMENT_HISTORY.md) только по фактически проверенным результатам.

## Приёмочный пакет

После реализации P1 собрать новый QA profile с:

- revision и списком закрытых MW/QA;
- real fixture hashes и expected/actual;
- before/after screenshots и accessibility evidence;
- browser/unit/performance logs;
- известными потерями импорта;
- отдельной ручной проверкой Yandex Browser и автоматикой Chromium.

Старые PASS не переписываются задним числом. NOT_RUN/BLOCKED остаются явно обозначенными до новой проверки.
