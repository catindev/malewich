# История разработки и архитектурных решений Malewich

Документ предназначен для агентов, которые будут развивать проект. Он объясняет не только **что сделано**, но и **почему были выбраны такие решения**, какие альтернативы отклонены и какие ошибки нельзя повторять. Это не хронология коммитов и не обещание полной совместимости с Figma.

## 1. Продуктовая рамка

Malewich — локальный браузерный редактор интерфейсов, а не облачная платформа совместной работы. Основная идея: открыть макет, сохранить его редактируемость, дать знакомые средства проектирования и не требовать сервер.

Документ хранится в текущих ключах `malewich-editor` и `malewich:document:v1`, а экспорт использует `*.malewich.json`. Отдельная миграция устаревших хранилищ больше не выполняется.

Принцип, который сохранялся на всех этапах:

> Сначала реальная редактируемая модель и предсказуемое поведение, затем визуальное сходство интерфейса. Скриншот макета не заменяет слои документа.

## 2. Базовая модель и первый редактор

### Выбранный стек

- React + TypeScript для UI и строгой модели.
- Zustand для документного состояния и команд.
- Vite для локальной разработки и production build.
- SVG для первого renderer и как долговечный формат экспорта.

### Абсолютная page-space геометрия

В документе каждый узел хранит абсолютные координаты страницы, а `parentId` задаёт иерархию. Это упростило импорт Figma, export и hit-test, но создало важное ограничение: нельзя применять один delta независимо на каждом уровне Pixi-иерархии.

При перемещении родителя store сдвигает всё поддерево в документе. Renderer обязан показать тот же delta ровно один раз. Позднее naive incremental translation вызывал двойной сдвиг; исправление проверялось не только координатами, но и pixel-сравнением с полным rebuild.

### Interaction перед украшением

Ранние UX-исправления касались поведения, которое пользователь ждёт от Figma:

- первый клик выбирает верхний фрейм, deep-select требует повторного клика или `Cmd/Ctrl`;
- pointer capture включается после фактического drag, чтобы не ломать double-click;
- текст редактируется на месте с одной рамкой, без дублирующих selection outlines;
- marquee, snapping, transforms, resize/rotate и clipboard работают на общей геометрии.

Эти решения объясняют, почему input и rendering нельзя менять независимо: hit-test, overlays и scene graph должны читать одну модель.

## 3. Auto Layout, компоненты и библиотека

Auto Layout был реализован как scoped resolver, а не как CSS Flexbox поверх DOM. Это позволило сохранить единую геометрию для canvas, export и редактирования.

Поддержаны direction, gap, padding, alignment, justify, Hug/Fixed/Fill, min/max и Absolute position. Итеративный resolver нужен для вложенных Hug ↔ Fill зависимостей.

Компоненты хранят main/instance links и overrides. Синхронизация не должна стирать локальные изменения instance. Variants используют `variantKey`, чтобы переключение не ломало selection и overrides.

Важные ограничения:

- изменение одной ветки не должно вызывать глобальный reflow импортированного документа;
- перемещение ребёнка Auto Layout нельзя считать безопасным pure translation preview: layout может законно вернуть позицию;
- component library может быть глобальной для документа, даже когда canvas показывает только активную страницу.

## 4. Figma import: редактируемость важнее плоского изображения

Для бинарных `.fig` использованы независимые Kiwi decoder и SceneGraph. Figma API и облачный доступ не нужны.

На реальном `TCB.PAY.fig` проверены 2 325 слоёв: 599 текстов, 671 vector, 691 Auto Layout, 26 main components, 176 instances, 122 переменные и 6 коллекций. Слои остаются отдельными объектами.

### Решения по визуальной точности

- Локальная page-space геометрия сохраняется при открытии через `preserveSavedGeometry`.
- Manrope и Inter поставляются локально и загружаются через FontFaceSet до создания Pixi text textures. Source family не подменяется в документе: общий stack `source → Inter → Arial → sans-serif` одинаково участвует в measurement, WebGL/SVG, редакторе и export, поэтому отсутствие системного `SF Pro Text` не меняет renderer на случайный системный шрифт.
- `graph.getAbsolutePosition()` включает собственные и родительские rotation/flip. Для Malewich с абсолютной нетрансформированной layout-геометрией его нельзя копировать вместе с этими flags: трансформация применится повторно. Импорт суммирует только локальные translations предков, а для одиночного flip меняет знак rotation, поскольку Figma использует flip → rotation, а общая matrix редактора — rotation → flip.
- Embedded `IMAGE` paints преобразуются в data URL только для поддержанных листовых frame/rectangle shapes и только при наличии bytes. `FILL` и `STRETCH` различаются как `cover` и `fill` во всех renderer/export; это не растеризация поддерева и не обещание произвольных image containers.
- Fit нового документа зависит от `doc.id`, а не только от `activePageId`: разные FIG часто используют одинаковый `fig-page-0`. `loadDocument` не сбрасывает viewport перед layout effect, поэтому async IndexedDB hydration не отменяет уже выполненный fit повторным reset на 100%.
- SVG vector paths сохраняют собственные fill/stroke/fill-rule. В WebGL closed contours дополнительно группируются по вложенности и фактическому winding: Pixi 8 иначе не вырезает holes у `nonzero` и зависит от порядка subpaths. Это исправляет внутренний вырез буквы «б» ТКБ без изменения сохранённой редактируемой геометрии.
- Expanded `strokeGeometry` заливается paint без повторной обводки.
- Если derived fill/stroke geometry отсутствует, `vectorNetwork` преобразуется в SVG curves и open segments; прямоугольная заглушка не подменяет иконку.
- Figma `isMask` сохраняется в модели, а mask-контур не рисуется как обычная заливка. Это убирает чёрные подложки логотипов, но не означает полноценную поддержку всех mask compositing modes.
- Видимые Figma-страницы сохраняются как страницы Malewich; Internal Only Canvas пропускается. Явный `backgroundPaints`/`backgroundColor` страницы сохраняется в `PageDefinition.background` и не смешивается с theme default.
- Figma LINE с нулевой шириной или высотой остаётся видимым vector stroke: масштабирование защищает нулевую ось, а `dashPattern`, cap и join проходят в общую модель и SVG/WebGL/export.
- Проверенные linear/radial gradient paints сохраняют stops и transform; WebGL создаёт локальный `FillGradient`, SVG/export — собственные definitions. Это ограниченный проверенный контур, а не общая поддержка всех Figma paints.
- Декодирование `.fig` вынесено в module Worker с transfer `ArrayBuffer`. Это уменьшает блокировку UI на больших файлах, но не отменяет необходимость проверять cold import, persistence и renderer после reload.

### Осознанные ограничения

Нельзя заявлять полную Figma parity. Проверены только linear/radial gradients в поддержанном shape/vector контуре; image fills на векторах и контейнерах с детьми, `CROP`/`TILE`, произвольный `imageTransform`, effects, маски, mixed text runs и все правила Variant sets не считаются полностью поддержанными. Проверенные TCB.PAY, UI Prep, Globbb, Transit Lines и BestProjects не доказывают корректность любого `.fig`.

Служебные frame labels нельзя удалять только из-за кажущегося дублирования: в исходном макете могут быть собственные текстовые заголовки рядом с фреймами.

## 5. Переход от SVG к PixiJS/WebGL

Большой импортированный макет показал предел DOM renderer: 54 126 DOM-элементов, медленный selection и pan. После перехода на retained WebGL диагностический DOM сократился примерно до 1 196 элементов, а сценарии стали заметно быстрее.

### Почему retained PixiJS

Замена renderer, layout и значительной части инфраструктуры одновременно не решала бы измеренные проблемы автоматически. Было решено сохранить PixiJS и развивать существующую модель:

- отдельная инвалидация transient preview и полной сцены;
- retained resources вместо пересоздания;
- отложенный финальный render;
- профилирование перед оптимизацией.

### Ошибки перехода и их исправления

1. **Пустой canvas.** Начальный `updateView()` принял чистое создание за translation и не создал visuals. Добавлен forced initial rebuild и non-blank browser assertion.
2. **Serif/обрезанный текст.** Нужны явная загрузка Manrope, корректный baseline и padding. Позднее обнаружилось размытие при zoom: текстовая текстура имела постоянное device resolution и растягивалась мировым transform. Сначала разрешение существующих `Text` синхронизировалось с zoom и DPR с ограничением 8×. Этого оказалось недостаточно на 6400%: растр снова растягивался. Теперь ограничение 8× убрано, а строки, не помещающиеся в GPU texture limit, делятся на retained-фрагменты; высокое разрешение получают только видимые фрагменты без изменения документа или пересоздания всей сцены.
3. **Чёрные иконки.** Pixi SVG parser добавлял default black fill; paint attributes перенесены в сам SVG. При переходе на прямое построение `GraphicsPath` прозрачность передаётся отдельно, а fill contours обходят ограничение parser с `nonzero` holes.
4. **Белый экран на больших изображениях.** `Texture.from(string)` читал Assets cache, а не загружал URL. Теперь texture создаётся после загрузки `HTMLImageElement`.
5. **Лист не двигался или двигался дважды.** Изменены правила retained transforms и добавлены pixel-тесты.
6. **Dots поверх макета и UI.** Grid вынесен в отдельный нижний SVG layer; stacking и pointer-events исправлены без удаления самой сетки.

SVG не удалён полностью: он нужен для selection handles, labels, text editor, export, fallback `?renderer=svg` и тестовых hit targets `?hitLayer=1`.

## 6. Профилирование drag: важность правильного эксперимента

Первые профили были недостоверными: указатель попадал не в canvas, selection менялся на другой слой или Auto Layout возвращал исходную позицию. Поэтому короткое время не означало быстрое перемещение — перемещения вообще не происходило.

После исправления profiler проверял target, selection и фактическую X-координату. Реальный 12-step drag корневого фрейма TCB.PAY занял около 18 секунд в diagnostic `?hitLayer=1` режиме.

### Что показал профиль

- Полные обходы `getNode`, `getChildren`, `getAncestors` на каждом шаге.
- Повторные snap bounds для всего документа.
- Полный variables/components/Auto Layout pipeline для pure translation.
- Пересоздание Pixi visuals всего поддерева.
- Большая доля native/software-WebGL `(program)`, которую `data-render-ms` не показывает.

### Внедрённые решения

1. WeakMap-индексы документа и indexed Auto Layout pass.
2. Snap bounds один раз на начало жеста.
3. Пропуск variables/Auto Layout derived pipeline только когда parent-relative геометрия действительно сохраняется. Отдельный non-translation check позволяет чистому X/Y main component обходить component reconciliation: instance roots, геометрия и identities остаются неизменными, что закреплено unit-регрессией.
4. Retained visuals для pure translation с нормализованными transforms.
5. Transient preview корневого фрейма в отдельном canvas: существующее поддерево двигается композитором, а при отпускании возвращается в основной WebGL scene.
6. Deferred root move: промежуточные pointer steps хранят только `rootIds` и последний delta, оставляя `state.doc` immutable. Artwork, selection и подпись корневого фрейма получают один и тот же compositor delta; release создаёт ровно один document commit/history entry. Поэтому Inspector X/Y корня обновляется на release, а не на каждом pointer step.

RenderTexture-кэш корня сознательно не используется. Для nested frames, Auto Layout и reparenting сохраняется полный document path, чтобы не потерять clipping, transforms предков и правила layout.

Результат одинакового diagnostic-сценария TCB.PAY: примерно **18 039 → 2 729 мс**. Обычный path без hit layer — около **2 341 мс**, корневой текст — **538 мс**. Отдельный реальный фрейм `ТКБ/Уведомления/Боковая навигация` в SMZ (52 descendants) после отказа от лишней component sync, React-обновлений Layers и промежуточных commits сократил 12-step жест примерно с **10,5 до 1,88–1,94 с**. Это software-WebGL диагностика, а не обещание одинакового времени на любом GPU. Начальный и финальный renders всё ещё зависят от растеризации и составляют основную оставшуюся стоимость последнего профиля.

### Compositor zoom и предел 25 600%

Zoom-dependent текстуры сделали буквы резкими, но первый вариант пересоздавал разрешение всех текстов и рисовал полный WebGL-кадр на каждом wheel event. На SMZ шаги диагностического жеста занимали примерно 347–1681 мс. Теперь каждый viewport change сразу задаёт canvas CSS `translate3d(...) scale(...)` относительно последнего WebGL-кадра. Через 90 мс паузы выполняется один финальный render; новое text resolution получают только видимые и не скрытые предками `Text`. Повторный профиль тех же шагов показал около 60–66 мс с активным compositor preview на каждом шаге. Это по-прежнему software-WebGL диагностика, а не универсальный GPU benchmark.

Диапазон viewport расширен до `0.05–256`, то есть 5–25 600%, включая fit-to-selection и presets. Вместо прежнего ограничения 8× длинный текст делится на фрагменты, размер которых ограничен возможностями GPU; это не заявление о бесконечно векторной резкости, но устраняет искусственное размытие обычных строк на большом zoom. Browser regression проверяет compositor preview и точный RGBA-pixel известной заливки на 25 600% и после возврата к 100%. Отдельная диагностика на реальном TCB.PAY зафиксировала `#18191F` в точке текстового штриха на 25 600%.

При этой проверке важен выбор координаты: центр text bounds на крайнем zoom может попасть в пробел между буквами и дать закономерно пустой кадр. Поэтому сначала на 400% находится реальный закрашенный pixel с закрашенными соседями, затем его мировая координата становится anchor для 25 600%. Наличие scene graph, отсутствие JS errors или успешный `app.render()` сами по себе не доказывают видимый результат.

### Повторный разбор scheduling и derived work

Поверх transient preview и раздельной инвалидации были закреплены следующие решения:

- асинхронные image/editing/resize invalidations запрашивают один общий rAF, без постоянного ticker и без debounce resize;
- font signature вычисляется по `doc.nodes`, а не на каждом zoom-only React render;
- `getPageDocument()` хранит projections в WeakMap по immutable document и `pageId`, поэтому EditorCanvas, Topbar, Inspector и LayersPanel не повторяют один обход;
- `commit()` сразу выходит при возврате прежнего document, а `commit()`/`recordSnapshot()` заменяют double `JSON.stringify` на `isDocumentContentEqual()` со сравнением serializable values и reference short-circuiting. В реальном edit обычно достаточно различия `updatedAt`; одинаковая ссылка не обходится вообще. JSON semantics для `undefined` object properties сохранены.

Корневой bitmap и tile scheduler не используются: они требуют иной модели покрытия, повторной растеризации и аккуратного mask/transform compositing. Ограниченные resource caches добавляются только там, где подтверждена польза и есть проверка инвалидации.

В корректном SMZ-профиле после ожидания 2 328/2 149 слоёв double stringify 3 МБ документа занимал около 19–22 мс, а сравнение изменённого snapshot стало ниже разрешения таймера. Повторные projections после первого обращения не выполняют обход. Zoom-профиль остался в пределах 61–66 мс на wheel step с compositor preview. Полное сравнение одинаковых глубоких клонов не выдаётся за ускорение: это редкий путь, основной выигрыш относится к no-op по ссылке и реальным изменённым документам.

## 7. Presentation и Dev Mode

Presentation технически загружала SVG, но на TCB.PAY открывала первый корневой фрейм «ТКБ / Элементы из кода» размером 1150×3890. Пользователь видел узкую длинную простыню вместо текущего экрана.

Решение: выбирать фрейм-предка selection, затем экран с наибольшей видимой областью, и только потом первый root frame. В player добавлен переключатель экранов. Prototype остаётся frame-level, без заявления hotspot parity.

После проверки второго реального макета data-URL заменён на inline SVG текущего экрана. Так Presentation не зависит от длины URI или повторной загрузки изображения и использует уже загруженные Manrope/Inter. Размер кадра вычисляется по stage через ResizeObserver, чтобы не было белых полос из-за двойного max-width/max-height. Глобальные editor shortcuts отключаются, пока открыт player: стрелки должны переключать экраны, а не двигать selection за оверлеем.

Dev Mode генерирует CSS из реальной модели. Подсветка реализована без `dangerouslySetInnerHTML`: tokenizer возвращает типизированные токены, React рисует spans, а copy использует исходный CSS. Тест проверяет, что конкатенация токенов возвращает исходник без изменений.

## 8. Figma-like рабочее пространство

Следующий этап был посвящён не новой геометрии, а способности понять документ:

- Frame и horizontal/vertical Auto Layout различаются иконками;
- Main Component и Instance получили фиолетовую идентичность;
- Auto Layout добавляется/удаляется через `+`/`−` в секции инспектора;
- canvas selection раскрывает предков и делает scroll into view;
- открытая библиотека не закрывается при selection;
- темы меняют UI, но не цвета макета;
- верхняя и нижняя панели убраны: project/panel/zoom controls находятся слева, undo/redo/presentation/theme — справа, а экспорт выделения находится в Inspector;
- `Cmd/Ctrl+\\` скрывает боковые панели, tool rail и canvas hint, оставляя только canvas.

При редизайне старые селекторы и привычные сценарии учитывались как регрессионный контур. Например, счётчик страниц получил отдельный класс от счётчика слоёв, а тест Auto Layout перешёл с checkbox на намеренно изменённую кнопку `+`.

Скрытие панелей первоначально размонтировало Layers и Inspector, поэтому повторный показ заново создавал дерево и вычислял page projections. Теперь компоненты остаются смонтированными с `hidden`, строки Layers мемоизированы, а лишние object counts на каждой странице удалены. Изменение ширины canvas очищает WebGL drawing buffer, а Pixi `resizeTo` слушает только `window.resize`, поэтому ResizeObserver явно resize-ит основной и drag-renderers по размеру контейнера и затем рисует retained-сцену. В diagnostic SMZ-сценарии двойной rAF после показа сократился примерно с 350–430 до 260–270 мс на software WebGL; это не универсальный GPU benchmark.

При оптимизации Layers выявился важный React-нюанс: сравнение только собственных props у memoized родителя блокирует получение новых `node`/`collapsed`/`renaming` потомками, даже если comparator самого потомка правильный. Полный browser suite поймал невидимое переименование текста и нераскрывающуюся ветку TCB.PAY. Итоговый comparator рекурсивно сравнивает display-свойства и child IDs поддерева, а изменения collapsed/renaming контекста намеренно пропускает вниз. Transform-only X/Y по-прежнему не перерисовывает строки; точность потомков не приносится в жертву мемоизации.

Inspector приведён к компактной Figma-схеме «Дизайн / Прототип» без постоянных bottom actions. Правый клик поддерживается не только на canvas, но и в слоях/страницах; modified secondary click открывает собственное меню, а Cmd/Ctrl+primary click сохраняет deep-select и не создаёт блокирующий overlay. Меню закрываются по Escape в capture-фазе до глобального сброса selection.

Объектное меню расширено рабочими командами вместо неактивных копий Figma: paste to replace, SVG/CSS copy, страницы, z-order, группы/фреймы, flatten/outline для фигур, Prototype, components и flip. Object group — прозрачный frame с `isGroup`, поэтому renderer, export и Auto Layout используют существующую иерархию без отдельного node type. Flip хранится в модели и входит в общую affine matrix/Pixi scale, поэтому hit-test и export не расходятся с artwork. Полные mask compositing, плагины и виджеты остаются явно обозначенными ограничениями.

Экспорт убран из глобальных controls и перенесён в нижнюю секцию Inspector для selection. PNG получает выбор 1–3×, SVG остаётся векторным, preview строится из той же `documentToSvg` модели, а имя файла берётся от слоя. JSON копия проекта остаётся отдельной командой меню проекта.

После реального использования убран повторяющийся заголовок «Слои»: один верхний ряд «Слои / Библиотека» предшествует страницам и дереву. Панели и Inspector подавляют системное context menu; для выделенного объекта Inspector переиспользует меню слоя. Native menu в текстовых полях намеренно сохранено для редактирования.

Финальная компоновка убрала отдельные Topbar и bottom status bar, а не стала прятать их визуально: `ProjectControls` и `ZoomControls` принадлежат левой панели, `ActionControls` с history/presentation/theme — правой. Это сохраняет команды без выделения им отдельных полос. В canvas-only режиме скрываются также tool rail и hint; общие viewport helpers не дают Fit/Zoom разойтись между командами. Регрессия сравнивает CSS/bitmap-размеры, точные red pixels и hit-target центра до скрытия и после восстановления, а при полном viewport 1440×960 дополнительно проверяет blue object в новооткрытой правой области, поэтому исправление не сводится к проверке отсутствия DOM-панелей.

## 9. Несколько страниц

Первоначальная подпись «Страница 1» не была моделью. Для настоящей поддержки выбрана схема с `pageId` только у корневых узлов.

### Почему не `pageId` на каждом узле

Descendants уже связаны с корнем через `parentId`. Дублирование страницы на каждом узле увеличивало бы миграции и риск рассинхронизации при reparenting.

### Почему полный документ остаётся в store

`state.doc` содержит все страницы, history и persistence. `getPageDocument()` создаёт производный документ активной страницы для canvas, layers, hit-test, snapping, fit, export и Presentation.

Если заменить полный документ производным внутри mutation, можно случайно удалить остальные страницы. Поэтому transient updates получают полный документ, а рабочие поверхности — активный.

### Миграция и команды

- Документ без pages трактуется как одна `page-1`.
- Новые корни получают активную страницу через store pipeline.
- Переключение очищает selection.
- Страницы можно создавать, переименовывать, дублировать и удалять.
- Группы остаются legacy metadata для старых JSON. После реального использования UI намеренно упрощён до плоского списка с drag ordering и context menu; создание новых групп не предлагается.
- Figma pages получают собственные IDs и имена при импорте.
- У каждой страницы есть независимый `background`; имя и цвет доступны в Inspector без selection.

Особенно важный регрессионный случай: две страницы могут содержать фреймы в одинаковых координатах. Hit-test, marquee, snap и parent search не должны видеть скрытую страницу. Поэтому importer больше не раскладывает страницы горизонтально: каждая сохраняет исходный coordinate space, а `EditorCanvas` делает fit при смене `activePageId`. На `TCB.PAY.SMZ.fig` это проверено для 2 328 слоёв «Справок» и 2 149 слоёв «Уведомлений».

Профиль переключения SMZ показал 0,9–1,1 с даже при возврате на уже открытую страницу: заново создавались Graphics и текстуры, а reset viewport, fit и visibility вызывали несколько полных renders. Теперь посещённые страницы имеют собственные retained worlds, которые очищаются при смене документа; fit выполняется в layout effect до renderer passive effects, а неизменённый viewport повторно не рисуется. Диагностическое время снизилось примерно до 0,55–0,75 с на software WebGL. Это по-прежнему on-demand renderer без RenderTexture-кэша и ticker; полный документ всех страниц в store не затрагивается.

Даже с retained worlds синхронный `setActivePage()` в click handler запускал проекцию и WebGL-работу до того, как браузер показывал активную строку. `PagesPanel` теперь сначала коммитит локальный `pendingPageId`, а полноценное переключение откладывает на два `requestAnimationFrame`. Повторный клик отменяет незавершённые frames, поэтому старое переключение не перекрывает новое. `aria-current="page"` следует за той же displayed selection. Browser regression на SMZ отдельно фиксирует момент, когда destination row уже активна, а `data-scene-page` ещё указывает предыдущую страницу; blur по-прежнему даёт обратную связь во время показа тяжёлого содержимого.

## 10. Правила для будущих решений

### Перед изменением renderer

1. Прочитать `PixiScene`, `EditorCanvas` и nested pixel test.
2. Сформулировать, что происходит с absolute geometry, masks и clipping.
3. Профилировать реальный жест с проверкой фактического изменения документа.
4. Проверить incremental result против полного rebuild.

### Перед изменением документной модели

1. Проверить pages, components, Auto Layout, export и storage одновременно.
2. Сохранить текущий JSON формата Malewich.
3. Разделить полный документ и active-page projection.
4. Добавить тест на изоляцию страниц и историю команд.

### Перед расширением Figma import

1. Описать поддерживаемое свойство и его поведение при редактировании, а не только при первом render.
2. Добавить fixture или воспроизводимый случай.
3. Проверить TCB.PAY на отсутствие глобального reflow.
4. Не объявлять общую поддержку по одному частному файлу.

### Перед оптимизацией

1. Измерить baseline и сохранить сценарий.
2. Разделить JS, React, native rasterization и persistence.
3. Не считать успешный render по наличию scene graph: проверять пиксели.
4. Не жертвовать визуальной точностью без явного transient-only компромисса и финального полного кадра.

## 11. DocumentChange, ресурсы и виртуализация

Следующий этап оптимизации начался с единого `DocumentChange` на границе Zustand. Он содержит revision, changed/deleted IDs, изменённые свойства, структурный признак и pure translation. Renderer обновляет только эти узлы и пересчитывает sibling order лишь при изменении структуры. Auto Layout и component sync возвращают прежние object references при равенстве значений, чтобы derived pass не создавал ложных изменений. Inspector и selection memoize производные узлы и настройки по document snapshot и selection.

Layers переведён на плоский список по `(document, page, collapsed)` и DOM только для видимых строк с небольшим overscan. Полный размер доступен через `data-layer-count`; scroll-into-view, rename, drag/drop и context menu сохранены. Это не просто мемоизация всех строк: теперь большое дерево не создаётся целиком в React/DOM.

Text measurement и wrapping кэшируются в design-space, измерения Pixi-фрагментов — отдельно от resolution. Загрузка шрифта повышает font generation и инвалидирует обе группы caches. Low-detail текст разрешён только как transient preview во время drag при zoom до 50%; release всегда восстанавливает полный кадр. Adaptive overscan зависит от viewport и ограничен 128 px.

Изображения используют общий cache `src + display bucket`. Меньшие bitmap создаются через `createImageBitmap` с canvas fallback, resolution повышается по мере zoom, а одинаковые src делят texture. LRU ограничен 128 МБ и 64 записями, но не вытесняет ресурсы с активными пользователями. Export продолжает работать с документом, а не с уменьшенной canvas-копией.

Сохранение больше не выполняет повторную сериализацию резервного JSON. Устаревшая миграция хранилищ удалена; поддерживаются только текущие IndexedDB и localStorage форматы Malewich.

Прогрессивная покадровая сборка страниц не внедрена. Холодный импорт включает Worker-декодирование и шрифты, а retained page scenes уже устраняют повторное создание при возврате и отменяют устаревшие клики. Разбиение дерева на промежуточные состояния добавило бы сложность и работу без доказанного улучшения. Raster damage и корневой RenderTexture по-прежнему не используются.

Для последующих изменений renderer/import/pages обязательна performance-regression проверка: повторяется последний релевантный compositor/import сценарий, сравниваются JS/React latency, native rasterization и persistence, а не только `data-render-ms`. Software-WebGL измерения используются как диагностический baseline конкретного окружения, не как общий benchmark.

## 12. Надёжность документа, retained views и параметрические фигуры

QA выявил три разных класса ошибок, которые нельзя исправлять локальным визуальным патчем.

Во-первых, резервная копия проекта обязана читать полный `state.doc`. Active-page projection подходит canvas и Inspector, но экспорт проекта через неё молча теряет остальные страницы. Это тот же документный инвариант, что у persistence и history.

Во-вторых, Pixi parent container не владеет retained views своих потомков. При Group → Undo потомки могут получить нового родителя, поэтому удаление старого view сначала отсоединяет child containers и уничтожает только собственные visual/mask/resources. Рекурсивный `destroy({ children: true })` на таком родителе разрушал объекты, которые история собиралась использовать повторно.

В-третьих, authoring primitives используют собственные сериализуемые параметры, а не прямоугольные имитации или предрасчитанные paths. Line/Arrow хранят start в `x/y`, длину в `width`, направление в `rotation` и настоящую нулевую `height`; endpoints получаются производно. Их rotation/flip pivot находится в первой endpoint, а не в центре bounding box: иначе изменение угла сдвигает начало отрезка и делает endpoint editing недостоверным. Тот же pivot обязан совпадать в SVG matrix, retained Pixi container, hit-test и Inspector. Arrow добавляет независимые `startArrowhead`/`endArrowhead`; Polygon хранит `sides`, Star — `points` и `innerRadius`. Общий `shapes.ts` строит paths для WebGL, SVG fallback и export, поэтому resize и точные поля меняют исходные параметры, а не теряют их растеризацией. Export bounds дополнительно включают stroke и arrowheads.

Selection для linear nodes показывает две endpoint handles вместо восьми resize handles. Endpoint drag держит противоположный конец неподвижным, `Shift` ограничивает угол 45°, release создаёт один history entry, а `Escape` возвращает `startDoc` без чернового узла. Shape menu сохраняет последнюю выбранную фигуру или изображение как главную иконку независимо от последующего возврата к Select.

Отдельное исправление Layers связано с виртуализацией: автоматический scroll into view нужен для нового selection и после автоматического раскрытия его предков, но не после каждого ручного expand/collapse. Иначе дерево отменяет ручную прокрутку и виртуально размонтирует целевую строку до клика.

## 13. Регрессионный ориентир

На момент initial public snapshot:

- 67 unit-тестов;
- 44 browser-сценария;
- production build TypeScript/Vite;
- TCB.PAY import/reload и non-blank canvas;
- nested move pixel equality;
- страницы, группы, Presentation, themes, selection scroll и CSS highlighting.

Текущий проверенный контур: **107 unit-тестов**, **67 browser-сценариев** и production TypeScript/Vite build. Дополнительно он включает DocumentChange и identity, виртуализацию 800 строк с доступностью последней, text layout/font generation, transient LOD с восстановлением полного кадра, shared downsampled image textures 512→2048, deferred root commit и live frame labels, invariance instances при main translation, nested Layers display updates, object operations/export, text tiling на 6400% и canvas-only pixel/hit-target alignment в старой и новооткрытой области. Community fixtures проверяют UI Prep embedded images + Inter + fit/reload и Globbb affine transforms с известными RGBA-пикселями; Transit Lines и BestProjects проверяют zero-size lines, stroke paints, page backgrounds, gradients, Worker import и reload; полные исходные файлы также открыты в WebGL/SVG. QA-пакет добавляет full multi-page backup, Group → Undo, popover/NumberField Escape, читаемые числовые значения и Figma primitives: Line/Arrow endpoints с WebGL/SVG/persistence, rotated hit-test, stroke editing/export, Polygon/Star params, JSON roundtrip, shape menu и стабильный ручной scroll в Layers.

Количество тестов должно расти вместе с функциональностью. Обновляйте README, CHANGELOG, UX_AUDIT и эту историю только фактически проверенными сведениями.
