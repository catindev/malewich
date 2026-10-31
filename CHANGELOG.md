# Changelog

Все заметные изменения Malewich документируются здесь. Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии следуют [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено

- Фирменный знак и русское название «Малевич» из исходного дизайна: наклонный холст с буквой M, красная и синяя панели в левой рабочей панели; светлая и тёмная favicon синхронизируются с выбранной темой.
- Цвет фона и имя активной страницы редактируются в инспекторе при снятом выделении.
- Плоский список страниц с drag-and-drop порядком и контекстным меню; старые group metadata продолжают читаться.
- Контекстные меню слоёв и страниц, поддержка Mac Control-click и закрытие меню по `Escape`.
- Режимы «Дизайн / Прототип» и компактные Figma-like секции свойств в правом инспекторе.
- Регрессионный fixture `TCB.PAY.SMZ.fig` с двумя страницами и 4 477 слоями.
- Лёгкий blur-transition canvas примерно на 240 мс после показа новой страницы с возвратом резкости и поддержкой `prefers-reduced-motion`; таймер запускается после реального кадра, а не до тяжёлого render.
- Точки сетки стали меньше и нейтрально-полупрозрачными; тёмная тема интерфейса больше не делает их почти чёрными на светлом фоне страницы.
- Диапазон масштаба холста расширен до 5–25 600%; добавлены zoom-пресеты до 25 600% и соответствующий предел для fit-to-selection.
- Секция экспорта выделения в Inspector с PNG/SVG, масштабом 1–3×, предпросмотром и именем файла по имени слоя.
- Расширенное объектное меню: paste to replace, SVG/CSS copy, Prototype links, перенос между страницами, порядок, группы/фреймы, rename, flatten/outline для фигур, Auto Layout, components, visibility/lock и flip.
- Регрессионные fixtures `Transit.Lines.fig` и `BestProjects.Tracker.fig` для Figma lines, page backgrounds, stroke paints и gradient paints.

### Изменено

- Верхняя и нижняя панели рабочего пространства убраны. Слева находятся проект, импорт, сохранение, переключатель UI и zoom; справа — Undo/Redo, Presentation и тема. Глобальный Export заменен экспортом выделения в Inspector. В footer остаются только число объектов и подписанный масштаб.
- `Cmd/Ctrl+\\` теперь скрывает также tool rail и canvas-подсказку: без панелей остаётся только canvas. Общие viewport helpers сохраняют корректный fit/zoom при новой ширине рабочей области.

### Исправлено

- Вторая Figma-страница больше не сдвигается за пределы viewport: исходные координаты сохраняются, а при переключении выполняется fit-to-content.
- Листовые Figma-фреймы и фигуры с embedded `IMAGE` fill больше не становятся прозрачными: `FILL`/`STRETCH` преобразуются в image-слои с корректным `cover`/`fill` в WebGL, SVG и export, включая обложку UI Prep.
- Figma rotation/flip больше не применяются дважды к уже трансформированным absolute positions. Отражённые иллюстрации Globbb, rotated vector parts и clipping совпадают с исходными world transforms в обоих renderer.
- Отсутствующий `SF Pro Text` и другие source fonts получают единый fallback `Inter → Arial → sans-serif`; локальный Inter добавлен в bundle, а source family и метрики не расходятся между измерением, canvas, SVG, редактором и export.
- Fit выполняется и при смене документа с тем же `activePageId`; асинхронная гидратация сохранения больше не сбрасывает уже вычисленный viewport на 100%.
- Presentation рендерит выбранный экран inline SVG с уже загруженными шрифтами и корректным aspect ratio; стрелки больше не двигают объекты за оверлеем.
- Select all в контекстном меню ограничен активной страницей.
- Возврат боковых панелей не монтирует их заново; ResizeObserver явно изменяет размер обоих WebGL renderers при flex-resize, а не ждёт только `window.resize`. Pixel-регрессия проверяет CSS/bitmap-ширину и объект в новооткрытой правой области, а не только старый центр canvas.
- Левая панель больше не дублирует «Слои»: единый ряд вкладок «Слои / Библиотека» находится над страницами и деревом.
- Панели и Inspector не открывают системное контекстное меню; для выделенного слоя доступно собственное меню команд.
- SMZ bell и другие векторы без derived geometry импортируются из `vectorNetwork` как настоящие curves, а не как чёрные прямоугольники.
- Figma mask-контуры логотипов ТКБ больше не рисуются как обычная чёрная подложка ни на canvas, ни в Presentation/export. Ранее сохранённые документы нужно один раз обновить повторным импортом исходного `.fig`: старый JSON не содержит утраченные curves и mask flags.
- Нулевые Figma LINE сохраняют видимый stroke, а dash pattern, cap/join, linear/radial gradients и page background проходят через импорт, SVG/WebGL и export в проверенном контуре.
- Большие `.fig` декодируются в Worker с transfer ArrayBuffer, поэтому импорт не блокирует основной поток редактора.
- Текст на canvas больше не размывается при увеличении: убран предел 8×, а длинные строки делятся на retained-фрагменты с учётом GPU texture limit. На 6400% видимые фрагменты получают разрешение по zoom/DPR вместо растягивания старого растра.
- Подпись корневого фрейма двигается вместе с artwork и selection во время deferred drag, а не догоняет объект после отпускания.
- Внутренние отверстия `nonzero`-векторов корректно вырезаются в WebGL независимо от порядка контуров; буква «б» в логотипе ТКБ больше не заливается. Исправление применяется к уже сохранённым редактируемым path без повторного импорта.

### Производительность

- `DocumentChange` передаёт в renderer только изменённые/deleted IDs, свойства и структурные признаки. Auto Layout и component sync сохраняют identity неизменённых узлов, а Inspector и selection кэшируют производные значения.
- Layers виртуализирован: плоский список кэшируется по документу, странице и collapsed state, а DOM содержит только видимые строки с overscan. Полное число строк остаётся доступно в `data-layer-count`.
- Text measurement, wrapping и измерения Pixi-фрагментов кэшируются отдельно от raster resolution; font generation инвалидирует их после загрузки шрифтов.
- Изображения используют общие display/DPR texture buckets с ограниченным LRU, повторным использованием и повышением resolution по мере zoom. Используемые ресурсы не вытесняются.
- Transient text LOD работает только во время zoomed-out drag preview; release восстанавливает полноценный текст. Adaptive overscan ограничен размером viewport и 128 px.
- Резервный JSON сериализуется один раз на сохранение. Устаревшая миграция хранилищ и специальный accept устаревших JSON удалены; текущие IndexedDB/localStorage форматы не изменились.
- Простой drag корневого фрейма больше не изменяет `state.doc` на каждый pointer step: artwork и selection двигаются compositor transform, а один document commit/history entry выполняется на release. Inspector X/Y корня намеренно обновляются при завершении жеста.
- Чистый X/Y translation main component не запускает reconciliation по документу: instances сохраняют геометрию и object identities. Строки Layers сравнивают только display-relevant поля и child IDs, не перерисовываясь из-за X/Y.
- В профиле реального SMZ-фрейма `ТКБ/Уведомления/Боковая навигация` 12-step drag сократился примерно с 10,5 до 1,88–1,94 с; оставшееся время преимущественно связано с native/software-WebGL startup и финальным кадром.
- Посещённые страницы сохраняют retained Pixi-сцены; переключение не пересоздаёт их Graphics и текстовые текстуры.
- Fit страницы выполняется до passive renderer effects, повторные viewport/visibility renders удалены. В software-WebGL диагностике SMZ переключение сократилось примерно с 0,9–1,1 до 0,55–0,75 с.
- Выбранная страница подсвечивается в левой панели до тяжёлой смены сцены; быстрые повторные клики отменяют устаревшие отложенные переключения.
- Wheel/pinch zoom использует немедленный compositor preview вместо полного WebGL render на каждое событие. Финальный кадр выполняется после 90 мс паузы, а разрешение пересчитывается только у видимого текста; в SMZ-профиле шаги жеста заняли около 60–66 мс.
- Асинхронные image/editing/resize invalidations коалесцируются в один rAF; font signature не пересчитывается при zoom-only renders, а проекция страницы переиспользуется компонентами через WeakMap.
- History больше не сравнивает документы двойным `JSON.stringify`: сериализуемые значения сравниваются с ранним выходом по ссылкам и `updatedAt`; no-op commit без изменений возвращается до derived pipeline. На SMZ устранено около 19–22 мс сериализации на snapshot в диагностическом профиле.
- Для каждого renderer/import изменения сохраняется performance-regression контур: полный browser suite повторно проверяет compositor pan/frame drag/zoom, retained scenes, text tiling, image buckets и импорт/reload; измерения native/software WebGL не трактуются как универсальный benchmark.

### Проверка

- 100 unit-тестов и 60 browser-сценариев; production TypeScript/Vite build.
- Полные `UI Prep Buttons (Community).fig` и `Globbb - Design System.fig` проверены в WebGL/SVG и после reload; community fixtures дополнительно проверяют embedded images, font fallback и известные RGBA-пиксели отражённых иллюстраций.
- Реальный SMZ проверен на DPR 2: резкий текст на 6400%, live frame labels и canvas-only 2480×1280 без обрезания новой области.

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
- Импорт бинарных `.fig` локальным decoder, включая слои, геометрию, компоненты, переменные и видимые страницы.
- Экспорт PNG, SVG и JSON; автосохранение в IndexedDB с localStorage fallback.
- Текущее хранилище и файлы Malewich без отдельной устаревшей миграции.
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
