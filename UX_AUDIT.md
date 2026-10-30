# UX-аудит Malewich относительно Figma

## Метод

Проверялись существующие функции редактора, а не наличие всей функциональности Figma. За эталон взято стандартное поведение Figma для selection, canvas navigation, transforms, frames, layers, text и clipboard. Живой экземпляр Figma в окружении недоступен, поэтому аудит не является side-by-side записью двух приложений.

Проверка Malewich выполняется в Chromium при viewport 1440×960. Сценарии находятся в `e2e/editor.spec.ts`, `e2e/parity.spec.ts` и `e2e/stage2.spec.ts`, модельные случаи — в `src/**/*.test.ts`.

## Найденные расхождения и результат

| Область | Что было не так | Поведение после доработки |
| --- | --- | --- |
| Вложенное выделение | Клик сразу выбирал глубоко вложенный объект | Первый клик выбирает верхний фрейм, повторный входит глубже, `Cmd/Ctrl+click` сразу делает deep-select |
| Click против drag | Pointer capture и `preventDefault` ломали `dblclick` | Capture включается только после фактического начала drag; клик и double-click различаются корректно |
| Текст на холсте | Double-click по вложенному тексту не открывал редактор | Double-click открывает текст на месте, скрывает исходный слой под полем, поддерживает blur, `Esc` и `Cmd/Ctrl+Enter` |
| Новый текст | Рамка не реагировала на длину вводимого текста | Auto-width пересчитывает ширину и высоту во время ввода; ручной resize переводит текст в fixed-size |
| Marquee | Перетаскивание пустой области только снимало выделение | Marquee выбирает пересекающиеся root-объекты; `Shift` добавляет следующую область к выделению |
| Направляющие | Не было выравнивания при перемещении | Края и центры привязываются в пределах 6 экранных px, отображаются направляющие |
| Resize с Shift | Объект становился квадратным независимо от исходной формы | Сохраняется исходный aspect ratio с учётом текущего zoom |
| Клавиатурное перемещение | Стрелки прокручивали интерфейс, но не двигали объект | Стрелки двигают на 1 px, `Shift+стрелка` — на 10 px; дети фрейма двигаются вместе с ним |
| Clipboard | Работало только дублирование | `Cmd/Ctrl+C/X/V` копирует, вырезает и вставляет иерархию на том же месте с новыми id |
| Alt-drag | Дублировать можно было только командой | `Alt+drag` создаёт копию и сразу перемещает её |
| Zoom | Не было Zoom to selection | `Shift+2` и пункт zoom-меню вписывают выделение; `Shift+1` по-прежнему вписывает документ |
| Trackpad | `Shift+wheel` не давал предсказуемой горизонтальной прокрутки | `Shift+wheel` двигает холст по горизонтали, обычный wheel — по вертикали |
| Frames | Объект исчезал за clipping при выносе и не менял родителя | Во время drag объект рисуется поверх clipping; при drop переносится в другой фрейм или на root с сохранением позиции и поворота |
| Layers | Новые фреймы были свёрнуты, drag-and-drop отсутствовал | Новые фреймы раскрыты; drag меняет порядок, drop в центр строки фрейма вкладывает объект; запрещено вкладывать фрейм сам в себя |
| Scroll интерфейса | Passive wheel listener допускал прокрутку страницы | Непассивный обработчик и overscroll containment оставляют панели неподвижными |

## Этап 2 «Базовое удобство редактора» — закрыт

| Направление | Реализованное поведение | Проверка |
| --- | --- | --- |
| Multi-transform | Общие resize и rotate вокруг общего bounds; обычный клик сворачивает multi-select, drag сохраняет группу | `stage2.spec.ts`: групповые resize/rotate |
| Align / distribute | Шесть команд выравнивания и распределение по горизонтали/вертикали с учётом размеров | Модельные тесты и сценарий align/distribute |
| Resize snapping | Привязка движущегося края к краям и центрам соседних объектов с направляющими | Модельные тесты и сценарий resize snapping |
| Текстовые режимы | Auto-width, auto-height и fixed-size; wrapping по словам, разрыв длинных слов, clipping fixed-size; единый layout для холста и SVG/PNG | `text.test.ts` и сценарий текстовых режимов |
| Хранение | Основное сохранение в IndexedDB, миграция из localStorage, резервная копия небольших документов, отсутствие лимита 8 МБ | Сохранение и перезагрузка документа с изображением больше 9 МБ |
| Контекстное меню | Copy/cut/paste, duplicate, порядок слоёв, select all, fit selection, создание фрейма и удаление по правому клику | Сценарий контекстного меню |

## Этап 3 «Инструмент для интерфейсов» — реализован

| Система | Реализованное поведение | Проверка |
| --- | --- | --- |
| Auto Layout | Horizontal/vertical, gap, четыре padding, cross-axis alignment, main-axis justify и space-between, Hug Contents, вложенные фреймы | `autoLayout.test.ts` и сценарий Auto Layout |
| Компоненты | Main component, instances с относительной геометрией, синхронизация свойств и детей, overrides, reset и detach | `components.test.ts`, store-тесты и сценарий instances |
| Стили | Цветовые и текстовые стили, создание из выделения, применение, редактирование и обновление связанных объектов | `library.test.ts` и сценарии color/text styles |
| Переменные | Цветовые и числовые переменные, привязки к свойствам и Auto Layout, редактирование и удаление связей | `library.test.ts` и сценарий number/color variables |
| Библиотека | Компоненты, стили и переменные в левой панели, выбор target property, создание instances | Все браузерные сценарии `stage3.spec.ts` |
| Межсистемные связи | Variables → layout → component sync, применение style/variable к instance как override | Store-тесты и production build |

## Этап 4 «Профессиональные макеты» — реализован

| Система | Реализованное поведение | Проверка |
| --- | --- | --- |
| Расширенный Auto Layout | Fixed/Fill у детей по осям, Fixed/Hug у фрейма по осям, min/max, Absolute position, итеративный resolver вложенных Hug ↔ Fill зависимостей | `autoLayoutAdvanced.test.ts` и сценарий Fill constraints |
| Variants | Component sets, создание варианта, переключение instance с сохранением ID, позиции и overrides через `variantKey` | `variants.test.ts` и сценарий Variants |
| Темы переменных | Коллекции, Light/Dark modes, значения по режимам, aliases и автоматическое обновление привязок | `variableCollections.test.ts` и сценарий Light/Dark |
| Prototype | Frame links, instant/dissolve/slide, duration, интерактивный player, история переходов и клавиатурная навигация | Сценарий Prototype |
| Dev Mode | CSS из реальных свойств, Auto Layout, typography, component metadata и ссылки на переменные | `devMode.test.ts` и сценарий Dev Mode |
| Библиотека | Поиск по всем разделам и drag-and-drop компонента в точку холста или фрейма | Сценарий search/drag |
| Горячие клавиши | Физические `event.code` для команд и цифр, независимость от русской раскладки | `hotkeys.spec.ts` |

### Осознанные ограничения этапа 4

- Prototype пока работает на уровне целого фрейма, без пользовательских hotspot-областей и сложного easing.
- Variants пока используют базовый набор свойств State без полноценного variant property editor.
- Dev Mode генерирует статический CSS, без экспорта assets и production-компонентов фреймворков.

## Этап 5 «Figma import и Malewich» — реализован

| Область | Реализованное поведение | Проверка |
| --- | --- | --- |
| Бинарный `.fig` | ZIP/fig-kiwi читается через OpenPencil decoder, видимые страницы превращаются в иерархический документ без Figma API | `figmaImport.test.ts` на реальном TCB.PAY |
| Редактируемые слои | Text, frames, shapes и SVG vector paths остаются отдельными объектами; у vectors сохраняются fill-rule, fill/stroke и resize | 599 text и 671 vector в browser-тесте |
| Layout и координаты | Локальные Figma-координаты преобразуются в абсолютные; border-aware padding, отрицательный overflow centering и zero-size Fill spacers | Полное сравнение геометрии и `autoLayoutAdvanced.test.ts` |
| Стабильность открытия | Figma-документ имеет `preserveSavedGeometry`; глобальный reflow при открытии не меняет авторские несогласованные сохранённые размеры | Import + reload в `figmaImport.spec.ts` |
| Scoped editing | Последующий edit пересчитывает только изменённую ветку Auto Layout и связанные instances, без reflow остального макета | Store/unit и все прежние browser suites |
| Components и variables | Main/instance links, overrides, 122 variables, 6 collections, modes и bindings сохраняются | Model tests и Instance inspector |
| Editing overlay | Во время текстового ввода скрыты outer selection, resize и rotation handles; остаётся одна рамка поля | Screenshot и DOM assertions |
| Общий обзор | Служебные frame labels скрываются при zoom ниже 20%, кроме выделенного фрейма | Full-canvas screenshot TCB.PAY |
| Типографика | Manrope 400/500/600/700 поставляется локально | `document.fonts.check` в Chromium |
| Хранение | Текущие ключи Malewich, миграция Forma localStorage/IndexedDB, поддержка старых `.forma.json` | Legacy migration test и большой IndexedDB test |

Подтверждённый fixture содержит 2 325 видимых слоёв, 26 main components и 176 instances. Второй fixture `TCB.PAY.SMZ.fig` добавляет 4 477 импортированных слоёв: 2 328 на «Справках» и 2 149 на «Уведомлениях»; browser-тест проверяет обе координатные области, непустой canvas второй страницы и Presentation её экрана. Общий importer пока покрывает solid paints; gradients, image fills, effects и смешанные text runs не заявлены как полностью поддержанные.

## Этап 6 «WebGL и отзывчивость большого макета» — реализован

| Область | Реализованное поведение | Проверка |
| --- | --- | --- |
| Retained WebGL | PixiJS хранит display objects по ID, обновляет изменённые слои и рисует только по требованию; постоянный ticker не используется | Pixel-level leaf drag и сравнение nested move с полным rebuild |
| Быстрый pan | Во время hand-drag canvas двигается через `translate3d()`, финальный WebGL-кадр выполняется при отпускании | Специальный compositor-pan сценарий |
| Быстрый frame drag | При простом перемещении корня документ остаётся immutable до release; существующее Pixi-поддерево и selection двигаются общим compositor delta без RenderTexture и промежуточных history entries; на release выполняются один commit и финальный кадр. Nested/Auto Layout/reparenting сохраняют безопасный document path | Inspector X остаётся прежним до release, transform assertion и pixel comparison с rebuild после reload |
| Горячие обходы | `WeakMap`-индексы документа и общих page projections, snap bounds один раз на жест, Auto Layout без полных `filter/find`, derived pipeline пропускается только для безопасного parent-relative translation | Unit-тесты store/layout/document и весь TCB.PAY browser path |
| Планирование и history | Image/editing/resize invalidations коалесцируются в один rAF без постоянного ticker; font signature мемоизирована; history использует структурное сравнение с reference/`updatedAt` short-circuit вместо double stringify | Unit-регрессии no-op/changed snapshots, SMZ-профиль, полный browser suite |
| DOM и hit-test | Полная SVG-разметка слоёв заменена JS geometry hit-test; SVG hit layer подключается только через `?hitLayer=1` | 1 196 DOM-элементов вместо 54 126 на TCB.PAY |
| Типографика | FontFaceSet загружает Manrope до генерации Pixi text textures; baseline и padding не обрезают строки; разрешение синхронизируется с zoom/DPR, поэтому 400% не растягивает старую текстуру | Font assertions, разрешение 1×→4× в browser-сценарии и Retina screenshot TCB.PAY |
| Быстрый и крайний zoom | Диапазон 5–25 600%; жест сразу масштабирует готовый canvas композитором, а после 90 мс паузы выполняется финальный WebGL render и перерисовка только видимого текста | Compositor-preview и точная проверка центрального pixel на 25 600% и после возврата к 100%; отдельная pixel-диагностика реального текста TCB.PAY |
| Векторы | Solid paints передаются прямо в Pixi Graphics; expanded `strokeGeometry` не обводится повторно; nonzero/evenodd contours группируются по winding и вложенности, включая holes перед outer path | Model assertion на реальном логотипе ТКБ, pixel assertion прозрачного hole и визуальная сверка иконок/логотипа |
| Изображения | HTMLImageElement создаёт texture после загрузки и запрашивает on-demand render; битый data URL не роняет React | IndexedDB сценарий с payload больше 9 МБ |
| Не-пустой кадр | Browser-тест проверяет размер PNG реального canvas, а не только число слоёв | Non-blank regression в `figmaImport.spec.ts` |
| Fallback | `?renderer=svg` сохраняет эталонный рендерер для сравнения и диагностики | Ручная side-by-side сверка TCB.PAY |

На TCB.PAY при 50% zoom выбор фрейма занял 100 мс вместо 817 мс, 12-step pan — 642 мс вместо 2 625 мс. При 100% zoom реальный 12-step drag корневого фрейма в одинаковом диагностическом `?hitLayer=1` режиме сократился с 18 039 до 2 729 мс; обычный путь без hit layer — 2 341 мс, drag корневого текста — 538 мс. Общее frame-drag время включает начальный и финальный WebGL-кадры, промежуточные шаги выполняются композитором. Это результаты headless Chromium с software WebGL; вызов `app.render()` не включает всю нативную растеризацию.

Отдельный профиль `ТКБ/Уведомления/Боковая навигация` (SMZ, 232×1000, 52 descendants) сократился примерно с 10,5 до 1,88–1,94 с для 12 pointer steps. Дополнительно устранены component reconciliation для чистого main translation, React-обновления дерева от X/Y и промежуточные document commits корневого drag. Это не означает устранение всей rendering latency: startup и финальный software-WebGL кадр остаются основной стоимостью замера.

## Этап 7 «Интерфейс, страницы и рабочее пространство» — реализован

| Область | Реализованное поведение | Проверка |
| --- | --- | --- |
| Страницы | Независимые иерархии с `pageId` у корней; создание, переключение с blur-transition примерно на 240 мс после реального кадра и поддержкой reduced motion, rename, duplicate и delete; старые документы остаются на «Странице 1» | Store-тесты, изоляция страниц и MutationObserver-проверка blur на тяжёлой SMZ |
| Плоский список страниц | Без группировки и лишних счётчиков; выбранная строка подсвечивается до загрузки новой сцены, быстрые клики отменяют устаревшее переключение; drag ordering, rename, duplicate/delete и page context menu; legacy groups не удаляют страницы | Store-тесты, browser-сценарий порядка/меню и MutationObserver-проверка подсветки до `data-scene-page` на SMZ |
| Фон страницы | Независимый `PageDefinition.background`, редактирование HEX/color picker без selection, сохранение и восстановление после reload | Store undo и browser-сценарий двух страниц |
| Типы слоёв | Frame, horizontal/vertical Auto Layout, Main Component и Instance различаются иконками, цветом и inspector badges | Browser-сценарий component/Auto Layout identity |
| Selection → Layers | Предки выбранного слоя раскрываются, строка подсвечивается и прокручивается в видимую область; открытая библиотека не закрывается | Глубоко вложенный 26-уровневый сценарий |
| Presentation | Старт из фрейма-предка выделения или наиболее видимого экрана, inline SVG с загруженными шрифтами, точный aspect ratio, переключатель экранов, история и изолированная клавиатура | Сценарии Screen B, Prototype и SMZ screenshot |
| Dev Mode | Безопасная React-подсветка CSS properties, selectors, variables, colors, numbers и comments; copy отдаёт исходный CSS | Token unit test и browser assertions |
| Тема и панели | Сохраняемая светлая/тёмная тема интерфейса; фирменный знак, favicon и `theme-color` адаптируются к ней; верхней/нижней панелей нет, команды распределены между левой и правой; `Cmd/Ctrl+\\` скрывает панели, tool rail и подсказку без размонтирования, оставляя только canvas; retained WebGL перерисовывается после resize | Browser-сценарии темы и брендинга, identity смонтированной панели, точные pixels/hit-targets до/во время/после скрытия и SMZ profile |
| Контекстные меню | Canvas, Layers, Pages и Inspector подавляют browser menu; для слоёв/страниц и выделения показываются собственные команды; Mac Control-click и Escape работают | Canvas Control-click, hide layer, panel default prevention и page menu в `interface.spec.ts` |
| Inspector | Вкладки «Дизайн / Прототип», компактная позиция и шесть alignment commands, Auto Layout, Appearance, отдельные Fill/Stroke | Все Inspector/Prototype browser suites и визуальная проверка |
| Figma pages | Видимые страницы и их имена сохраняются при импорте в исходных coordinate spaces, корни получают соответствующий `pageId`; переключение делает fit до render и переиспользует retained page scenes | Assertions на TCB.PAY и двухстраничном TCB.PAY.SMZ |
| SMZ vectors и логотипы | Bell без derived geometry строится из `vectorNetwork`; mask-контур ТКБ не выводится как обычная чёрная заливка в canvas/Presentation; старая сохранённая модель обновляется повторным импортом `.fig` | Unit fixtures, SVG path/mask assertions и WebGL/Presentation screenshots |

## Этап 8 «Объектные команды и точность рабочей области» — реализован

| Область | Реализованное поведение | Проверка |
| --- | --- | --- |
| Object menu | Paste to replace, SVG/CSS copy, Prototype links, move to page, z-order, group/frame, rename, flatten/outline для фигур, Auto Layout, components, visibility/lock и flip работают через store и Undo/Redo; маски/плагины/виджеты не выдаются за готовые | Unit-тесты nodeOperations и browser-сценарий group → rename → flip → move to page |
| Экспорт selection | Нижняя секция Inspector содержит PNG/SVG, 1–3×, preview и filename по имени объекта; глобального Export больше нет | Browser download assertions для `Акцент.svg` и `Акцент@2x.png` |
| Controls и canvas-only | Panel toggle слева, Undo/Redo справа; footer содержит только object count и «масштаб»; ResizeObserver явно меняет оба drawing buffer при flex-resize | CSS/bitmap dimensions, red pixel в старой области и blue pixel в новооткрытой правой области, реальный SMZ 2480×1280 |
| Текст и frame drag | Видимые текстовые фрагменты растрируются по zoom/DPR без прежнего cap 8× и с учётом GPU limit; подпись корня получает тот же deferred delta, что artwork/selection | 400%/6400% browser-сценарий, реальный SMZ на DPR 2, label position до и после release |

## Оставшиеся отличия от Figma

Это уже следующие этапы, а не незакрытые пункты этапа 2:

1. **Векторное редактирование.** Double-click по фигуре пока не открывает редактор узлов и контуров.
2. **Продвинутая типографика.** Нет смешанных стилей внутри текста, выделения слов и caret под точкой клика.
3. **Продвинутые направляющие.** Нет rulers, пользовательских guides и layout/grid guides.
4. **Системный clipboard.** Буфер работает внутри приложения, обмен с другими приложениями не реализован.
5. **Продвинутые слои.** Нет auto-scroll при drag, точных drop-индикаторов и всех правил вложенности Figma.
6. **Производительность и платформы.** WebGL уже используется, но панель слоёв ещё не виртуализирована полностью, полноценная touch-поддержка отсутствует, а fit/zoom очень больших сцен остаются зависимыми от скорости растеризации GPU.
7. **Следующие продуктовые этапы.** Hotspots и продвинутые transitions, production code export, командная библиотека и совместная работа ещё не реализованы.

## Регрессионный контур

- `npm test` — 84 проверки геометрии, serializable document comparison, shared page projections, no-op/changed history, сохранения instance geometry/identities при main translation, vectorNetwork, mask metadata, zoom-dependent text resolution, object operations и affine flip, nonzero/evenodd contours и реального TKB hole, иерархии, страниц и фона, legacy groups, snapping, selection, group transforms, text layout, Auto Layout и Fill/Hug, components и Variants, library, modes, CSS tokenizer, store, clipboard и реальные Figma imports.
- `npm run test:e2e` — 53 сценария: theme-aware логотип и favicon, pointer/keyboard и русская раскладка, object export с preview/format settings, IndexedDB и legacy migration, плоские страницы и независимый фон, мгновенная подсветка страницы до смены сцены, component/Auto Layout identity, selection scroll, темы и persistent panels, canvas-only режим с точными pixels/hit-targets и полным viewport, single-outline double-click, marquee, smart guides, transforms, deferred root commit с обновлением Inspector на release, reparenting, canvas/layer/page context menus, group/rename/flip/move-to-page и Control-click против deep-select, Auto Layout, instances, Variants, styles, Prototype с изолированной клавиатурой, Dev Mode highlighting, library drag-and-drop, compositor pan/frame drag/zoom, pixel-level leaf/nested movement, text resolution 100%/400%/6400% с texture tiling, точный pixel на 25 600% и после возврата к 100%, прозрачный pixel nonzero hole после финального WebGL-кадра, TCB.PAY import/reload и двухстраничный TCB.PAY.SMZ с non-blank canvas и Presentation assertions.
