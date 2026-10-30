{(() => {
  const C = {
    canvas: '#EFF0ED', panel: '#FFFFFF', ink: '#20221F', muted: '#7B7F78', faint: '#A4A8A0',
    line: '#E4E6E1', soft: '#F4F5F2', hover: '#EBEDE8', blue: '#356FC4', blueSoft: '#EAF1FC',
    red: '#E24832', brandBlue: '#2D63A8', green: '#2C8B68', greenSoft: '#EAF6F0',
    amber: '#B47A22', amberSoft: '#FFF5E4', violet: '#7456B8', violetSoft: '#F1EDFA',
    darkCanvas: '#161816', darkPanel: '#20231F', darkSoft: '#2A2D29', darkLine: '#383C36',
    darkInk: '#F1F3ED', darkMuted: '#9BA198', white: '#FFFFFF', black: '#151615'
  }

  const paths = {
    chevron: 'M9 6l6 6-6 6', down: 'M6 9l6 6 6-6', pointer: 'M5 3l14 10-7 1 4 6-3 1-4-6-4 4V3z',
    frame: 'M5 5h14v14H5zM5 10h14M10 5v14', square: 'M5 5h14v14H5z',
    pen: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3', type: 'M5 5h14M12 5v14M8 19h8',
    hand: 'M8 11V5a2 2 0 014 0v5-7a2 2 0 014 0v8-5a2 2 0 014 0v8c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 013-2l2 1z',
    comment: 'M4 5h16v11H9l-5 4V5z', search: 'M10.5 4a6.5 6.5 0 105.4 10L21 19l-1.5 1.5-5.1-5.1A6.5 6.5 0 0010.5 4z',
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
    lock: 'M6 10h12v10H6zM8 10V7a4 4 0 018 0v3', more: 'M5 12h.01M12 12h.01M19 12h.01',
    link: 'M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1',
    play: 'M8 5l11 7-11 7V5z', sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
    moon: 'M20 15a8 8 0 01-11-11 9 9 0 1011 11z', panels: 'M4 5h16v14H4zM9 5v14M15 5v14',
    export: 'M12 16V3M7 8l5-5 5 5M5 14v6h14v-6', fit: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5',
    branch: 'M6 3v12a4 4 0 004 4h8M6 8a3 3 0 100-6 3 3 0 000 6zM18 20a3 3 0 100-6 3 3 0 000 6z',
    check: 'M5 12l4 4L19 6', close: 'M6 6l12 12M18 6L6 18', up: 'M12 19V5M6 11l6-6 6 6', downArrow: 'M12 5v14M6 13l6 6 6-6',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
    send: 'M3 4l18 8-18 8 3-8-3-8zM6 12h15', clip: 'M8 12l6-6a4 4 0 016 6l-8 8a6 6 0 01-8-8l8-8',
    history: 'M3 12a9 9 0 109-9 9 9 0 00-7 3M3 4v6h6M12 7v5l4 2', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l4 2',
    code: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18', component: 'M12 2l4 4-4 4-4-4 4-4zM5 9l4 4-4 4-4-4 4-4zM19 9l4 4-4 4-4-4 4-4zM12 16l4 4-4 4-4-4 4-4z',
    layers: 'M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M16 8h.01',
    arrow: 'M4 12h16M14 6l6 6-6 6', undo: 'M9 7l-5 5 5 5M4 12h9a6 6 0 016 6',
    info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7h.01', copy: 'M8 8h12v12H8zM4 16V4h12',
    sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6', trash: 'M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6',
    cursor: 'M5 3l14 10-7 1 4 6-3 1-4-6-4 4V3z', grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'
  }

  function T({ x = 0, y = 0, w = 100, text, size = 11, color = C.ink, weight = 400, align = 'left', lineHeight, name = 'Текст', letterSpacing = 0 }) {
    return <Text name={name} x={x} y={y} w={w} font="Inter" size={size} weight={weight} color={color} textAlign={align} textAutoResize="height" lineHeight={lineHeight ?? size * 1.35} letterSpacing={letterSpacing}>{text}</Text>
  }

  function I({ x = 0, y = 0, name, size = 16, color = C.muted, stroke = 1.7 }) {
    return <svg name={`Иконка / ${name}`} x={x} y={y} size={size} viewBox="0 0 24 24"><path d={paths[name] ?? paths.square} fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" /></svg>
  }

  function Mark({ x, y, s = 0.18, dark = false }) {
    return <Frame name="Знак Малевич" x={x} y={y} w={160 * s} h={150 * s}>
      <Frame name="Холст с M" x={8 * s} y={10 * s} w={100 * s} h={100 * s} rotate={-12}>
        <Rectangle w={100 * s} h={100 * s} bg={dark ? C.darkInk : C.black} />
        <svg x={10 * s} y={10 * s} size={80 * s} viewBox="0 0 100 100"><path d="M15 10 H31 L50 43 L69 10 H85 V90 H68 V43 L50 72 L32 43 V90 H15 Z" fill={dark ? C.darkPanel : '#FFFFFF'} /></svg>
      </Frame>
      <Rectangle name="Синяя панель" x={0} y={116 * s} w={90 * s} h={25 * s} rotate={-12} bg={C.brandBlue} />
      <Rectangle name="Красная панель" x={112 * s} y={0} w={42 * s} h={126 * s} rotate={12} bg={C.red} />
    </Frame>
  }

  function Button({ x, y, w, h = 32, text, icon, primary = false, danger = false, dark = false, disabled = false, size = 11, align = 'center' }) {
    const bg = disabled ? (dark ? C.darkSoft : C.soft) : primary ? C.blue : danger ? C.red : (dark ? C.darkSoft : C.panel)
    const color = disabled ? (dark ? C.darkMuted : C.faint) : primary || danger ? C.white : dark ? C.darkInk : C.ink
    const border = primary || danger || disabled ? '#00000000' : dark ? C.darkLine : C.line
    return <Frame name={`Кнопка / ${text}`} x={x} y={y} w={w} h={h} rounded={6} bg={bg} stroke={border} strokeWidth={1}>
      {icon && <I x={align === 'left' ? 10 : Math.max(8, (w - text.length * size * 0.58 - 20) / 2)} y={(h - 15) / 2} name={icon} size={15} color={color} />}
      <T x={icon ? (align === 'left' ? 31 : 0) : 0} y={(h - size * 1.35) / 2 - 1} w={icon && align === 'left' ? w - 36 : w} text={text} size={size} weight={600} color={color} align={align} />
    </Frame>
  }

  function Pill({ x, y, w, h = 26, text, icon, color = C.ink, bg = C.soft, dark = false, size = 10 }) {
    return <Frame name={`Метка / ${text}`} x={x} y={y} w={w} h={h} rounded={h / 2} bg={bg}>
      {icon && <I x={8} y={(h - 13) / 2} name={icon} size={13} color={color} />}
      <T x={icon ? 26 : 10} y={(h - size * 1.35) / 2 - 1} w={w - (icon ? 31 : 20)} text={text} size={size} weight={550} color={color} align="center" />
    </Frame>
  }

  function Checkbox({ x, y, checked = true, color = C.blue, dark = false }) {
    return <Frame name={checked ? 'Флажок / выбран' : 'Флажок'} x={x} y={y} w={15} h={15} rounded={4} bg={checked ? color : '#00000000'} stroke={checked ? color : dark ? C.darkMuted : C.faint} strokeWidth={1}>
      {checked && <I x={1.5} y={1.5} name="check" size={12} color={C.white} stroke={2.3} />}
    </Frame>
  }

  function SectionTitle({ x = 12, y, w = 216, text, right, dark = false, color }) {
    return <>
      <T x={x} y={y} w={w - 40} text={text} size={9} weight={700} color={color ?? (dark ? C.darkMuted : C.muted)} letterSpacing={0.7} />
      {right && <T x={x + w - 45} y={y} w={45} text={right} size={9} color={dark ? C.darkMuted : C.muted} align="right" />}
    </>
  }

  function Brand({ dark = false }) {
    return <Frame name="Проект" x={0} y={0} w={240} h={64} bg={dark ? C.darkPanel : C.panel}>
      <Mark x={12} y={15} s={0.18} dark={dark} />
      <T x={50} y={12} w={150} text="Малевич" size={14} weight={750} color={dark ? C.darkInk : C.ink} />
      <T x={50} y={34} w={160} text="Пульс / Продукт.fig" size={10} color={dark ? C.darkMuted : C.muted} />
      <I x={215} y={24} name="down" size={14} color={dark ? C.darkMuted : C.muted} />
    </Frame>
  }

  function PanelTabs({ active = 'layers', dark = false }) {
    const items = [['layers', 'Слои', 12, 68], ['agent', 'Агент', 84, 76], ['git', 'Git', 164, 62]]
    return <Frame name="Режимы левой панели" x={0} y={64} w={240} h={40} bg={dark ? C.darkPanel : C.panel}>
      {items.map(([id, label, x, w]) => <Frame name={`Вкладка / ${label}`} x={x} y={5} w={w} h={29} rounded={5} bg={active === id ? (dark ? C.darkSoft : C.soft) : '#00000000'}>
        {id === 'agent' && <I x={8} y={8} name="sparkle" size={13} color={active === id ? C.blue : dark ? C.darkMuted : C.muted} />}
        {id === 'git' && <I x={8} y={8} name="branch" size={13} color={active === id ? C.blue : dark ? C.darkMuted : C.muted} />}
        <T x={id === 'layers' ? 0 : 25} y={8} w={id === 'layers' ? w : w - 27} text={label} size={10} weight={active === id ? 650 : 500} color={active === id ? (dark ? C.darkInk : C.ink) : dark ? C.darkMuted : C.muted} align={id === 'layers' ? 'center' : 'left'} />
      </Frame>)}
      <Rectangle x={0} y={39} w={240} h={1} bg={dark ? C.darkLine : C.line} />
    </Frame>
  }

  function CanvasControls({ dark = false, focus = false, zoom = '80%', branch, agent = false, git = false }) {
    const left = focus ? 16 : 256
    const right = focus ? 1216 : 944
    const panel = dark ? C.darkPanel : C.panel
    const ink = dark ? C.darkInk : C.ink
    const line = dark ? C.darkLine : C.line
    return <>
      <Frame name="Путь и контекст" x={left} y={16} w={branch ? 328 : 286} h={38} rounded={8} bg={panel} stroke={line} strokeWidth={1} shadow="0 3 12 #0000000D">
        <I x={11} y={11} name={git ? 'branch' : agent ? 'sparkle' : 'layers'} size={16} color={agent ? C.violet : git ? C.amber : C.blue} />
        <T x={35} y={11} w={branch ? 244 : 202} text={branch ?? 'Пульс / Главная / Обзор'} size={10} weight={550} color={ink} />
        <I x={(branch ? 328 : 286) - 29} y={12} name="link" size={14} color={dark ? C.darkMuted : C.muted} />
      </Frame>
      <Frame name="Действия просмотра" x={right} y={16} w={focus ? 208 : 200} h={38} rounded={8} bg={panel} stroke={line} strokeWidth={1} shadow="0 3 12 #0000000D">
        <I x={12} y={11} name="play" size={16} color={ink} />
        <Rectangle x={39} y={9} w={1} h={20} bg={line} />
        <I x={51} y={11} name={dark ? 'sun' : 'moon'} size={16} color={dark ? C.darkMuted : C.muted} />
        <I x={81} y={11} name="panels" size={16} color={dark ? C.darkMuted : C.muted} />
        <Rectangle x={108} y={9} w={1} h={20} bg={line} />
        <I x={119} y={11} name="export" size={15} color={dark ? C.darkMuted : C.muted} />
        <T x={140} y={12} w={55} text="Экспорт" size={10} weight={550} color={ink} />
      </Frame>
      <Frame name="Инструменты" x={left} y={254} w={40} h={328} rounded={9} bg={panel} stroke={line} strokeWidth={1} shadow="0 5 18 #00000012">
        {['pointer', 'frame', 'square', 'pen', 'type', 'hand', 'comment'].map((name, index) => <Frame name={`Инструмент / ${name}`} x={4} y={5 + index * 39} w={32} h={32} rounded={6} bg={index === 0 ? C.blueSoft : '#00000000'}>
          <I x={8} y={8} name={name} size={16} color={index === 0 ? C.blue : dark ? C.darkMuted : C.muted} />
        </Frame>)}
        <Rectangle x={9} y={278} w={22} h={1} bg={line} />
        <I x={12} y={292} name="more" size={16} color={dark ? C.darkMuted : C.muted} />
      </Frame>
      <Frame name="Масштаб" x={left} y={844} w={158} h={38} rounded={8} bg={panel} stroke={line} strokeWidth={1} shadow="0 3 12 #0000000D">
        <I x={11} y={11} name="minus" size={15} color={dark ? C.darkMuted : C.muted} />
        <T x={34} y={11} w={54} text={zoom} size={10} weight={600} color={ink} align="center" />
        <I x={94} y={11} name="plus" size={15} color={dark ? C.darkMuted : C.muted} />
        <Rectangle x={119} y={9} w={1} h={20} bg={line} />
        <I x={130} y={11} name="fit" size={15} color={dark ? C.darkMuted : C.muted} />
      </Frame>
    </>
  }

  function Shell({ dark = false, active = 'layers', focus = false, zoom = '80%', branch, agent = false, git = false, left, right, children }) {
    const panel = dark ? C.darkPanel : C.panel
    const line = dark ? C.darkLine : C.line
    return <>
      {!focus && <>
        <Rectangle name="Левая панель" x={0} y={0} w={240} h={900} bg={panel} />
        <Rectangle name="Правая панель" x={1160} y={0} w={280} h={900} bg={panel} />
        <Rectangle x={239} y={0} w={1} h={900} bg={line} />
        <Rectangle x={1160} y={0} w={1} h={900} bg={line} />
        <Brand dark={dark} />
        <PanelTabs active={active} dark={dark} />
      </>}
      {children}
      <CanvasControls dark={dark} focus={focus} zoom={zoom} branch={branch} agent={agent} git={git} />
      {!focus && left}
      {!focus && right}
    </>
  }

  function LayerRow({ y, icon = 'frame', text, depth = 0, selected = false, component = false, hidden = false, badge }) {
    const x = 12 + depth * 14
    return <Frame name={`Слой / ${text}`} x={8} y={y} w={224} h={28} rounded={5} bg={selected ? C.blueSoft : '#00000000'}>
      <I x={x} y={7} name={component ? 'component' : icon} size={14} color={component ? C.violet : selected ? C.blue : C.muted} />
      <T x={x + 21} y={7} w={160 - depth * 10} text={text} size={10} weight={selected ? 600 : 450} color={selected ? C.blue : hidden ? C.faint : C.ink} />
      {badge && <Pill x={190} y={5} w={28} h={18} text={badge} size={8} color={C.muted} bg={C.soft} />}
      {hidden && <I x={207} y={8} name="eye" size={12} color={C.faint} />}
    </Frame>
  }

  function LayersPanel() {
    return <Frame name="Структура документа" x={0} y={104} w={240} h={796}>
      <Frame name="Выбор страницы" x={12} y={10} w={216} h={32} rounded={6} bg={C.soft}>
        <I x={9} y={9} name="frame" size={14} color={C.muted} />
        <T x={31} y={9} w={132} text="Главная" size={10} weight={550} />
        <Pill x={168} y={7} w={24} h={18} text="4" size={8} color={C.muted} bg={C.panel} />
        <I x={198} y={10} name="down" size={12} color={C.muted} />
      </Frame>
      <Frame name="Поиск слоёв" x={12} y={52} w={216} h={30} rounded={6} bg={C.panel} stroke={C.line} strokeWidth={1}>
        <I x={9} y={8} name="search" size={14} color={C.faint} />
        <T x={31} y={8} w={140} text="Поиск слоёв" size={10} color={C.faint} />
        <T x={180} y={8} w={26} text="⌘F" size={9} color={C.faint} align="right" />
      </Frame>
      <SectionTitle x={14} y={100} w={210} text="СЛОИ" right="24" />
      <I x={207} y={96} name="plus" size={14} color={C.muted} />
      <LayerRow y={122} text="Обзор" depth={0} icon="frame" />
      <LayerRow y={150} text="Навигация" depth={1} icon="layers" />
      <LayerRow y={178} text="Логотип" depth={2} component />
      <LayerRow y={206} text="Разделы" depth={2} icon="layers" hidden />
      <LayerRow y={234} text="Шапка" depth={1} icon="frame" />
      <LayerRow y={262} text="Заголовок" depth={2} icon="type" />
      <LayerRow y={290} text="Кнопка / Добавить" depth={2} component />
      <LayerRow y={318} text="Показатели" depth={1} icon="frame" badge="3" />
      <LayerRow y={346} text="Карточка / Баланс" depth={2} component />
      <LayerRow y={374} text="Карточка / Доходы" depth={2} component selected />
      <LayerRow y={402} text="Карточка / Расходы" depth={2} component />
      <LayerRow y={430} text="Динамика" depth={1} icon="frame" />
      <LayerRow y={458} text="График" depth={2} icon="image" />
      <LayerRow y={486} text="Цель" depth={1} icon="frame" />
      <LayerRow y={514} text="Операции" depth={1} icon="frame" />
      <LayerRow y={542} text="Таблица" depth={2} icon="layers" />
      <Frame name="Локальное сохранение" x={0} y={724} w={240} h={72}>
        <Rectangle x={0} y={0} w={240} h={1} bg={C.line} />
        <Ellipse x={13} y={18} w={28} h={28} bg={C.black} />
        <T x={13} y={26} w={28} text="ВЛ" size={9} weight={700} color={C.white} align="center" />
        <T x={51} y={16} w={120} text="Вы · локально" size={10} weight={600} />
        <Ellipse x={52} y={39} w={6} h={6} bg={C.green} />
        <T x={64} y={35} w={130} text="Сохранено сейчас" size={9} color={C.muted} />
        <I x={207} y={25} name="more" size={15} color={C.muted} />
      </Frame>
    </Frame>
  }

  function Field({ x, y, w = 80, label, value, dark = false, accent = false }) {
    return <Frame name={`Поле / ${label}`} x={x} y={y} w={w} h={30} rounded={5} bg={dark ? C.darkSoft : C.soft}>
      <T x={8} y={8} w={18} text={label} size={9} color={dark ? C.darkMuted : C.muted} />
      <T x={27} y={8} w={w - 34} text={value} size={10} weight={accent ? 650 : 500} color={accent ? C.blue : dark ? C.darkInk : C.ink} align="right" />
    </Frame>
  }

  function InspectorSection({ y, h, title, children, action = 'plus' }) {
    return <Frame name={`Секция / ${title}`} x={0} y={y} w={280} h={h}>
      <Rectangle x={0} y={0} w={280} h={1} bg={C.line} />
      <T x={12} y={14} w={190} text={title} size={11} weight={650} />
      {action && <I x={250} y={13} name={action} size={14} color={C.muted} />}
      {children}
    </Frame>
  }

  function Inspector() {
    return <Frame name="Инспектор дизайна" x={1160} y={0} w={280} h={900} bg={C.panel}>
      <Frame name="Режимы инспектора" x={0} y={0} w={280} h={52}>
        <T x={14} y={19} w={60} text="Дизайн" size={10} weight={650} color={C.blue} />
        <T x={79} y={19} w={70} text="Прототип" size={10} color={C.muted} />
        <T x={157} y={19} w={40} text="Код" size={10} color={C.muted} />
        <I x={249} y={18} name="more" size={15} color={C.muted} />
        <Rectangle x={12} y={50} w={54} h={2} bg={C.blue} />
        <Rectangle x={0} y={51} w={280} h={1} bg={C.line} />
      </Frame>
      <Frame name="Выбранный компонент" x={0} y={52} w={280} h={66}>
        <I x={13} y={15} name="component" size={15} color={C.violet} />
        <T x={35} y={13} w={185} text="Карточка / Доходы" size={12} weight={650} />
        <T x={35} y={34} w={190} text="Компонент · 3 экземпляра" size={9} color={C.muted} />
        <I x={249} y={20} name="link" size={14} color={C.muted} />
      </Frame>
      <InspectorSection y={118} h={139} title="Выравнивание" action={null}>
        {['left', 'center', 'right'].map((v, i) => <Frame x={12 + i * 35} y={39} w={30} h={28} rounded={5} bg={C.soft}><I x={7} y={6} name={i === 0 ? 'frame' : i === 1 ? 'sliders' : 'panels'} size={16} color={C.muted} /></Frame>)}
        <Field x={12} y={77} w={122} label="X" value="340" />
        <Field x={142} y={77} w={126} label="Y" value="92" />
      </InspectorSection>
      <InspectorSection y={257} h={156} title="Размер и Auto Layout" action={null}>
        <Field x={12} y={39} w={122} label="W" value="172" accent />
        <Field x={142} y={39} w={126} label="H" value="88" accent />
        <T x={12} y={82} w={80} text="Направление" size={9} color={C.muted} />
        <Pill x={184} y={75} w={84} h={24} text="Вертикально" size={9} color={C.ink} bg={C.soft} />
        <Field x={12} y={108} w={122} label="↔" value="16" />
        <Field x={142} y={108} w={126} label="Gap" value="8" />
      </InspectorSection>
      <InspectorSection y={413} h={110} title="Внешний вид" action={null}>
        <Field x={12} y={39} w={122} label="%" value="100" />
        <Field x={142} y={39} w={126} label="R" value="12" />
        <T x={12} y={82} w={220} text="Заливка, обводка и эффекты" size={9} color={C.muted} />
      </InspectorSection>
      <InspectorSection y={523} h={115} title="Заливка">
        <Rectangle x={13} y={43} w={26} h={26} rounded={5} bg={C.white} stroke={C.line} strokeWidth={1} />
        <T x={49} y={48} w={92} text="#FFFFFF" size={10} weight={550} />
        <T x={200} y={48} w={50} text="100%" size={10} color={C.muted} align="right" />
        <I x={250} y={48} name="eye" size={14} color={C.muted} />
      </InspectorSection>
      <InspectorSection y={638} h={104} title="Переменные" action="plus">
        <Pill x={12} y={41} w={118} h={25} text="surface/card" size={9} color={C.violet} bg={C.violetSoft} />
        <Pill x={138} y={41} w={92} h={25} text="radius/12" size={9} color={C.violet} bg={C.violetSoft} />
      </InspectorSection>
      <Frame x={12} y={766} w={256} h={74} rounded={7} bg={C.soft}>
        <I x={11} y={12} name="info" size={15} color={C.muted} />
        <T x={34} y={11} w={205} text="Один жест — одна отмена" size={10} weight={600} />
        <T x={34} y={32} w={205} text="⌘Z отменит всё изменение,\nEsc вернет состояние до жеста." size={9} color={C.muted} lineHeight={13} />
      </Frame>
    </Frame>
  }

  function Handle({ x, y, color = C.blue, size = 7 }) {
    return <Rectangle name="Маркер выделения" x={x} y={y} w={size} h={size} bg={C.white} stroke={color} strokeWidth={1.2} />
  }

  function Dashboard({ x, y, compact = false, selection = false, agent = false }) {
    const statsY = 92, statsH = compact ? 76 : 88, chartY = compact ? 180 : 204, tableY = compact ? 412 : 440
    return <Frame name={agent ? 'Макет / Предпросмотр агента' : 'Макет / Пульс — Обзор'} x={x} y={y} w={720} h={620} rounded={12} bg={C.white} shadow="0 12 36 #28342A14" overflow="hidden">
      <Rectangle name="Навигация макета" x={0} y={0} w={132} h={620} bg="#F7F8F5" />
      <Rectangle x={20} y={24} w={20} h={20} rounded={5} bg={C.black} />
      <Rectangle x={30} y={18} w={10} h={24} rotate={12} bg={C.red} />
      <T x={50} y={25} w={65} text="пульс" size={14} weight={750} />
      {['Обзор', 'Операции', 'Цели', 'Отчёты'].map((label, i) => <Frame x={12} y={82 + i * 40} w={108} h={30} rounded={6} bg={i === 0 ? '#E8ECE6' : '#00000000'}>
        <I x={9} y={8} name={i === 0 ? 'grid' : i === 1 ? 'layers' : i === 2 ? 'check' : 'image'} size={13} color={i === 0 ? C.ink : C.muted} />
        <T x={29} y={8} w={70} text={label} size={9} weight={i === 0 ? 650 : 500} color={i === 0 ? C.ink : C.muted} />
      </Frame>)}
      <Frame x={16} y={548} w={100} h={48} rounded={8} bg={C.white} stroke={C.line} strokeWidth={1}>
        <Ellipse x={8} y={10} w={26} h={26} bg="#D9C5B2" />
        <T x={41} y={9} w={51} text="Анна" size={9} weight={650} />
        <T x={41} y={25} w={51} text="Личный" size={8} color={C.muted} />
      </Frame>
      <T x={156} y={27} w={300} text="Добрый день, Анна" size={compact ? 19 : 21} weight={700} letterSpacing={-0.5} />
      <T x={156} y={60} w={300} text="Вот что происходит с вашими финансами." size={10} color={C.muted} />
      <Frame name="Главное действие" x={580} y={28} w={116} h={34} rounded={7} bg={C.black}>
        <I x={12} y={10} name="plus" size={14} color={C.white} />
        <T x={32} y={10} w={70} text="Добавить" size={10} weight={600} color={C.white} />
      </Frame>
      {[['Баланс', '248 320 ₽', '+4,8%', C.black], ['Доходы', '184 200 ₽', '+12,4%', C.green], ['Расходы', '96 480 ₽', '−2,1%', C.red]].map(([label, value, delta, color], i) => {
        const cx = compact ? 156 + i * 182 : 156 + i * 184
        return <Frame name={`Карточка / ${label}`} x={cx} y={statsY} w={172} h={statsH} rounded={10} bg={C.white} stroke={C.line} strokeWidth={1}>
          <T x={14} y={12} w={90} text={label} size={9} weight={550} color={C.muted} />
          <T x={14} y={compact ? 34 : 38} w={140} text={value} size={compact ? 16 : 18} weight={700} letterSpacing={-0.3} />
          <Pill x={112} y={11} w={48} h={19} text={delta} size={8} color={color} bg={label === 'Баланс' ? C.soft : label === 'Доходы' ? C.greenSoft : '#FCEDEA'} />
        </Frame>
      })}
      <Frame name="Динамика" x={156} y={chartY} w={364} h={220} rounded={10} bg={C.white} stroke={C.line} strokeWidth={1}>
        <T x={16} y={15} w={130} text="Динамика" size={11} weight={650} />
        <Pill x={273} y={11} w={74} h={23} text="6 месяцев" size={8} color={C.muted} bg={C.soft} />
        <T x={16} y={40} w={140} text="184 200 ₽" size={20} weight={700} />
        <T x={16} y={68} w={160} text="Доходы за июнь" size={9} color={C.muted} />
        {[0, 1, 2, 3].map(i => <Rectangle x={18} y={101 + i * 27} w={326} h={1} bg="#EFF1ED" />)}
        <svg x={18} y={91} size={320} viewBox="0 0 320 110"><path d="M0 92 C30 80 38 91 63 69 S105 77 128 49 S174 61 195 34 S242 44 263 19 S295 26 320 6" fill="none" stroke={C.brandBlue} stroke-width="3" stroke-linecap="round" /></svg>
        {['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'].map((m, i) => <T x={18 + i * 62} y={197} w={40} text={m} size={8} color={C.faint} />)}
      </Frame>
      <Frame name="Цель" x={compact ? 530 : 532} y={chartY} w={compact ? 166 : 164} h={220} rounded={10} bg="#202A25">
        <T x={15} y={15} w={100} text="Цель на июнь" size={10} weight={600} color={C.white} />
        <T x={15} y={38} w={130} text="Подушка безопасности" size={8} color="#AEBBB3" />
        <Ellipse x={39} y={74} w={88} h={88} bg="#303D35" />
        <Ellipse x={50} y={85} w={66} h={66} bg="#202A25" />
        <T x={39} y={102} w={88} text="72%" size={18} weight={700} color={C.white} align="center" />
        <T x={15} y={180} w={134} text="216 000 из 300 000 ₽" size={8} color="#C8D1CB" align="center" />
      </Frame>
      <Frame name="Операции" x={156} y={tableY} w={540} h={150} rounded={10} bg={C.white} stroke={C.line} strokeWidth={1}>
        <T x={16} y={14} w={160} text="Последние операции" size={11} weight={650} />
        <T x={447} y={15} w={76} text="Все операции" size={8} color={C.blue} align="right" />
        {[['СберМаркет', 'Сегодня, 14:32', '−2 840 ₽'], ['Перевод от Ильи', 'Вчера, 19:10', '+12 000 ₽'], ['Метро', 'Вчера, 08:42', '−64 ₽']].map(([name, date, amount], i) => <Frame x={12} y={42 + i * 33} w={516} h={30}>
          <Ellipse x={0} y={2} w={24} h={24} bg={i === 1 ? C.greenSoft : C.soft} />
          <T x={36} y={1} w={160} text={name} size={9} weight={550} />
          <T x={36} y={15} w={160} text={date} size={7.5} color={C.faint} />
          <T x={400} y={7} w={104} text={amount} size={9} weight={600} color={i === 1 ? C.green : C.ink} align="right" />
        </Frame>)}
      </Frame>
      {selection && <>
        <Rectangle name="Выделение / Карточка доходов" x={336} y={88} w={180} h={96} bg="#00000000" stroke={C.blue} strokeWidth={1.2} />
        {[0, 1, 2, 3].map(i => <Handle x={i % 2 === 0 ? 333 : 513} y={i < 2 ? 85 : 181} />)}
        <Pill x={336} y={65} w={139} h={20} text="Карточка / Доходы" size={8} color={C.white} bg={C.blue} />
        <Pill x={374} y={187} w={104} h={20} text="172 × 88" size={8} color={C.white} bg={C.blue} />
        <Rectangle x={168} y={178} w={516} h={1} bg={C.red} opacity={0.7} />
        <Pill x={321} y={169} w={24} h={17} text="12" size={7} color={C.white} bg={C.red} />
        <Pill x={505} y={169} w={24} h={17} text="12" size={7} color={C.white} bg={C.red} />
      </>}
      {agent && <>
        <Rectangle x={148} y={84} w={556} h={compact ? 84 : 96} bg="#00000000" stroke={C.green} strokeWidth={1.5} strokeDash={[5, 4]} />
        <Pill x={148} y={61} w={122} h={21} text="1 · 5 свойств" size={8} color={C.white} bg={C.green} />
        <Rectangle x={148} y={chartY - 8} w={380} h={228} bg="#00000000" stroke={C.green} strokeWidth={1.5} strokeDash={[5, 4]} />
        <Pill x={148} y={chartY - 31} w={102} h={21} text="2 · 1 свойство" size={8} color={C.white} bg={C.green} />
        <Rectangle x={574} y={22} w={128} h={46} bg="#00000000" stroke={C.green} strokeWidth={1.5} strokeDash={[5, 4]} />
        <Pill x={574} y={0} w={102} h={21} text="3 · 1 свойство" size={8} color={C.white} bg={C.green} />
      </>}
    </Frame>
  }

  function StatusFooter({ dark = false, text = 'Сохранено локально' }) {
    return <Frame name="Состояние документа" x={0} y={850} w={240} h={50}>
      <Rectangle x={0} y={0} w={240} h={1} bg={dark ? C.darkLine : C.line} />
      <Ellipse x={14} y={16} w={8} h={8} bg={C.green} />
      <T x={30} y={14} w={150} text={text} size={9} color={dark ? C.darkMuted : C.muted} />
      <T x={190} y={14} w={34} text="⌘S" size={9} color={dark ? C.darkMuted : C.faint} align="right" />
    </Frame>
  }

  function Screen01() {
    return <Frame name="01 — Рабочее место" x={0} y={0} w={1440} h={900} bg={C.canvas} overflow="hidden">
      <Shell left={<><LayersPanel /><StatusFooter /></>} right={<Inspector />}>
        <T x={340} y={91} w={300} text="ОБЗОР / DESKTOP · 1440 × 1024" size={9} weight={600} color={C.muted} letterSpacing={0.4} />
        <Dashboard x={340} y={122} selection />
        <Frame name="Комментарий к объекту" x={1008} y={477} w={30} h={30} rounded={15} bg={C.violet} stroke={C.white} strokeWidth={2}>
          <T x={0} y={7} w={30} text="2" size={10} weight={700} color={C.white} align="center" />
        </Frame>
        <Pill x={531} y={773} w={330} h={28} text="V  Выбор     ⌘K  Команды     ⌘\\  Панели" size={9} color={C.muted} bg="#FFFFFFCC" />
      </Shell>
    </Frame>
  }

  function Screen02() {
    return <Frame name="02 — Точность и фокус" x={1520} y={0} w={1440} h={900} bg={C.darkCanvas} overflow="hidden">
      <Shell dark focus zoom="400%">
        <T x={380} y={151} w={420} text="КОМПОНЕНТ / СТАТУС · 4 × 4 PX" size={9} weight={600} color={C.darkMuted} letterSpacing={0.5} />
        <Frame name="Макет остаётся светлым" x={380} y={180} w={640} h={440} rounded={10} bg={C.white} shadow="0 16 40 #00000035">
          <Rectangle x={0} y={0} w={640} h={72} bg="#F6F7F4" />
          <Mark x={26} y={22} s={0.18} />
          <T x={64} y={25} w={150} text="Пульс / Обзор" size={13} weight={650} />
          <Pill x={486} y={22} w={118} h={28} text="Синхронизировано" size={8} color={C.green} bg={C.greenSoft} />
          <T x={42} y={116} w={300} text="Состояние системы" size={24} weight={700} />
          <T x={42} y={157} w={390} text="Все данные сохранены на этом устройстве." size={12} color={C.muted} />
          <Frame x={42} y={206} w={556} h={92} rounded={10} bg={C.soft}>
            <Ellipse x={20} y={24} w={40} h={40} bg={C.greenSoft} />
            <I x={29} y={33} name="check" size={22} color={C.green} />
            <T x={78} y={24} w={260} text="Локальная копия актуальна" size={13} weight={650} />
            <T x={78} y={50} w={330} text="Последняя проверка — только что" size={10} color={C.muted} />
            <Rectangle name="Объект 4 × 4 px при 400%" x={500} y={38} w={16} h={16} rounded={3} bg={C.green} />
          </Frame>
          <T x={42} y={346} w={420} text="Размеры overlay не зависят от масштаба документа." size={11} color={C.muted} />
        </Frame>
        <Rectangle name="Выделение малого объекта" x={916} y={382} w={28} h={28} bg="#00000000" stroke={C.blue} strokeWidth={1.2} />
        {[0, 1, 2, 3].map(i => <Handle x={i % 2 === 0 ? 913 : 941} y={i < 2 ? 379 : 407} size={7} />)}
        <Rectangle x={929} y={353} w={1} h={24} bg={C.blue} />
        <Ellipse x={926} y={347} w={7} h={7} bg={C.white} stroke={C.blue} strokeWidth={1.2} />
        <Pill x={883} y={416} w={94} h={23} text="4 × 4 px" size={9} color={C.white} bg={C.blue} />
        <Rectangle x={364} y={396} w={580} h={1} bg={C.red} opacity={0.85} />
        <Rectangle x={930} y={164} w={1} h={274} bg={C.red} opacity={0.85} />
        <Pill x={714} y={384} w={58} h={22} text="8 px" size={8} color={C.white} bg={C.red} />
        <Frame name="Контекстная точность" x={798} y={236} w={284} h={137} rounded={9} bg={C.darkPanel} stroke={C.darkLine} strokeWidth={1} shadow="0 8 24 #00000040">
          <T x={14} y={13} w={160} text="Точность жеста" size={12} weight={650} color={C.darkInk} />
          <Pill x={197} y={10} w={72} h={23} text="400%" size={9} color="#9DBCF4" bg="#2B3B50" />
          <T x={14} y={48} w={140} text="Объект" size={10} color={C.darkMuted} />
          <T x={169} y={48} w={98} text="4 × 4 px" size={10} weight={600} color={C.darkInk} align="right" />
          <T x={14} y={72} w={140} text="На экране" size={10} color={C.darkMuted} />
          <T x={169} y={72} w={98} text="16 × 16 px" size={10} weight={600} color={C.darkInk} align="right" />
          <T x={14} y={96} w={140} text="Привязка" size={10} color={C.darkMuted} />
          <T x={169} y={96} w={98} text="1 px экрана" size={10} weight={600} color="#9DBCF4" align="right" />
        </Frame>
        <Frame name="Активные модификаторы" x={512} y={664} w={404} h={54} rounded={9} bg={C.darkPanel} stroke={C.darkLine} strokeWidth={1}>
          <Pill x={12} y={13} w={112} h={28} text="⇧  Только ось X" size={9} color={C.white} bg={C.blue} />
          <Pill x={133} y={13} w={119} h={28} text="⌥  Копировать" size={9} color={C.darkMuted} bg={C.darkSoft} />
          <Pill x={261} y={13} w={129} h={28} text="Esc  Отменить" size={9} color={C.darkMuted} bg={C.darkSoft} />
        </Frame>
        <Frame name="Клавиатурная подсказка" x={352} y={817} w={736} h={48} rounded={9} bg={C.darkPanel} stroke={C.darkLine} strokeWidth={1}>
          <T x={18} y={16} w={700} text="⌘K  Команды     F  К выбору     ⌘\\  Панели     ?  Все горячие клавиши" size={10} color={C.darkMuted} align="center" />
        </Frame>
        <I x={955} y={419} name="cursor" size={22} color={C.darkInk} />
      </Shell>
    </Frame>
  }

  function AgentPanel() {
    return <Frame name="Диалог с агентом" x={0} y={104} w={240} h={796}>
      <SectionTitle x={14} y={13} text="КОНТЕКСТ ЗАДАЧИ" right="3" />
      <Frame x={12} y={37} w={216} h={87} rounded={8} bg={C.soft}>
        <Pill x={9} y={9} w={76} h={22} text="Главная" icon="frame" size={8} color={C.ink} bg={C.panel} />
        <Pill x={91} y={9} w={76} h={22} text="3 слоя" icon="layers" size={8} color={C.ink} bg={C.panel} />
        <Pill x={9} y={38} w={156} h={22} text="feature/compact" icon="branch" size={8} color={C.violet} bg={C.violetSoft} />
        <T x={10} y={68} w={190} text="Объекты привязаны по ID, не по координатам" size={7.5} color={C.muted} />
      </Frame>
      <SectionTitle x={14} y={147} text="ДИАЛОГ" />
      <Frame x={28} y={172} w={200} h={82} rounded={9} bg={C.blueSoft}>
        <T x={12} y={12} w={176} text="Сделай карточки компактнее, сохрани иерархию и усиль главное действие." size={10} color={C.ink} lineHeight={15} />
      </Frame>
      <T x={28} y={261} w={160} text="Вы · 14:32" size={8} color={C.faint} />
      <Frame x={12} y={283} w={216} h={206} rounded={9} bg={C.panel} stroke={C.line} strokeWidth={1}>
        <I x={12} y={13} name="sparkle" size={17} color={C.violet} />
        <T x={37} y={12} w={156} text="План готов" size={11} weight={650} />
        <T x={12} y={42} w={188} text="Изменил только выбранный контекст. На холсте — обратимый предпросмотр." size={9} color={C.muted} lineHeight={13} />
        {['Сжать три карточки', 'Поднять блок динамики', 'Увеличить контраст кнопки'].map((text, i) => <Frame x={12} y={91 + i * 27} w={190} h={24}>
          <Ellipse x={0} y={4} w={14} h={14} bg={C.greenSoft} />
          <I x={2} y={6} name="check" size={10} color={C.green} />
          <T x={22} y={4} w={165} text={text} size={8.5} color={C.ink} />
        </Frame>)}
        <Pill x={12} y={176} w={190} h={21} text="7 правок · ничего не применено" size={8} color={C.green} bg={C.greenSoft} />
      </Frame>
      <Frame x={12} y={509} w={216} h={73} rounded={8} bg={C.violetSoft}>
        <I x={11} y={12} name="branch" size={15} color={C.violet} />
        <T x={34} y={11} w={160} text="Отдельная ветка" size={10} weight={650} color={C.violet} />
        <T x={12} y={36} w={188} text="agent/compact-cards создана до предпросмотра. Рабочая версия не затронута." size={8.5} color={C.muted} lineHeight={12} />
      </Frame>
      <Frame name="Ввод агента" x={12} y={646} w={216} h={102} rounded={9} bg={C.panel} stroke={C.line} strokeWidth={1}>
        <T x={12} y={12} w={180} text="Опишите следующий шаг…" size={9} color={C.faint} />
        <I x={12} y={72} name="clip" size={15} color={C.muted} />
        <Pill x={35} y={66} w={83} h={23} text="3 слоя" size={8} color={C.muted} bg={C.soft} />
        <Frame x={176} y={65} w={28} h={28} rounded={14} bg={C.black}><I x={7} y={7} name="send" size={14} color={C.white} /></Frame>
      </Frame>
      <StatusFooter text="Агент · только предпросмотр" />
    </Frame>
  }

  function DiffRow({ y, title, detail, checked = true, color = C.green }) {
    return <Frame name={`Правка / ${title}`} x={12} y={y} w={256} h={43} rounded={6} bg={checked ? C.greenSoft : C.soft}>
      <Checkbox x={10} y={13} checked={checked} color={color} />
      <T x={34} y={7} w={150} text={title} size={9.5} weight={600} />
      <T x={34} y={24} w={160} text={detail} size={8.5} color={C.muted} />
      <T x={199} y={15} w={45} text={checked ? 'Включено' : 'Пропуск'} size={7.5} color={checked ? color : C.muted} align="right" />
    </Frame>
  }

  function AgentReview() {
    return <Frame name="Проверка правок агента" x={1160} y={0} w={280} h={900} bg={C.panel}>
      <Frame x={0} y={0} w={280} h={70}>
        <I x={14} y={20} name="sparkle" size={18} color={C.violet} />
        <T x={42} y={15} w={180} text="Проверка агента" size={13} weight={700} />
        <T x={42} y={38} w={190} text="Черновик · 7 изменений" size={9} color={C.muted} />
        <Rectangle x={0} y={69} w={280} h={1} bg={C.line} />
      </Frame>
      <Frame x={12} y={84} w={256} h={54} rounded={7} bg={C.blueSoft}>
        <I x={11} y={11} name="eye" size={15} color={C.blue} />
        <T x={35} y={10} w={204} text="Предпросмотр, не документ" size={10} weight={650} color={C.blue} />
        <T x={35} y={30} w={204} text="Нажмите на номер, чтобы перейти к объекту." size={8} color={C.muted} />
      </Frame>
      <SectionTitle x={14} y={158} w={250} text="КАРТОЧКИ · 5 СВОЙСТВ" right="1" />
      <DiffRow y={183} title="Высота карточки" detail="88 → 76 px" />
      <DiffRow y={231} title="Внутренний отступ" detail="16 → 12 px" />
      <DiffRow y={279} title="Интервал сетки" detail="12 → 8 px" />
      <DiffRow y={327} title="Размер значения" detail="18 → 16 px" />
      <DiffRow y={375} title="Нижний отступ" detail="24 → 16 px" checked={false} />
      <SectionTitle x={14} y={440} w={250} text="ДРУГИЕ ОБЪЕКТЫ" right="2" />
      <DiffRow y={465} title="Динамика · Y" detail="204 → 180 px" />
      <DiffRow y={513} title="Кнопка · контраст" detail="4,2 → 7,1 : 1" />
      <Frame x={12} y={580} w={256} h={67} rounded={7} bg={C.soft}>
        <I x={11} y={11} name="undo" size={15} color={C.muted} />
        <T x={34} y={10} w={205} text="Частичное принятие" size={10} weight={650} />
        <T x={34} y={31} w={205} text="Каждая правка сохраняет ID объекта и исходное значение." size={8.5} color={C.muted} lineHeight={12} />
      </Frame>
      <T x={14} y={675} w={250} text="ВЫБРАНО 5 ИЗ 7" size={9} weight={700} color={C.green} letterSpacing={0.5} />
      <Button x={12} y={702} w={256} h={38} text="Принять выбранное · 5" primary icon="check" />
      <Button x={12} y={748} w={124} h={34} text="Отменить всё" />
      <Button x={144} y={748} w={124} h={34} text="В диалог" />
      <T x={14} y={805} w={250} text="После принятия: один шаг Undo для всей операции." size={8.5} color={C.muted} align="center" />
    </Frame>
  }

  function Screen03() {
    return <Frame name="03 — Агент и проверка" x={3040} y={0} w={1440} h={900} bg={C.canvas} overflow="hidden">
      <Shell active="agent" agent branch="agent/compact-cards · предпросмотр" left={<AgentPanel />} right={<AgentReview />}>
        <Frame name="Режимы сравнения агента" x={585} y={72} w={230} h={32} rounded={7} bg={C.panel} stroke={C.line} strokeWidth={1}>
          <T x={10} y={9} w={55} text="Было" size={9} color={C.muted} align="center" />
          <Frame x={70} y={4} w={76} h={24} rounded={5} bg={C.greenSoft}><T x={0} y={6} w={76} text="Стало" size={9} weight={650} color={C.green} align="center" /></Frame>
          <T x={153} y={9} w={67} text="Наложение" size={9} color={C.muted} align="center" />
        </Frame>
        <T x={340} y={116} w={300} text="ПУЛЬС / ОБЗОР · CHANGES 1—3" size={9} weight={600} color={C.green} letterSpacing={0.4} />
        <Dashboard x={340} y={146} compact agent />
        <Pill x={523} y={788} w={354} h={27} text="Зелёный — только предложенные агентом изменения" size={9} color={C.green} bg={C.greenSoft} />
      </Shell>
    </Frame>
  }

  function GitChange({ y, icon = 'frame', text, meta, type = 'changed', selected = false }) {
    const color = type === 'added' ? C.green : type === 'deleted' ? C.red : C.amber
    return <Frame name={`Git / ${text}`} x={8} y={y} w={224} h={43} rounded={6} bg={selected ? C.amberSoft : '#00000000'}>
      <I x={10} y={9} name={icon} size={14} color={selected ? C.amber : C.muted} />
      <T x={31} y={7} w={152} text={text} size={9.5} weight={selected ? 650 : 500} />
      <T x={31} y={24} w={158} text={meta} size={8} color={C.muted} />
      <T x={191} y={13} w={23} text={type === 'added' ? '+' : type === 'deleted' ? '−' : 'Δ'} size={13} weight={700} color={color} align="center" />
    </Frame>
  }

  function GitPanel({ conflict = false }) {
    return <Frame name={conflict ? 'Конфликты Git' : 'Git и история'} x={0} y={104} w={240} h={796}>
      <Frame x={12} y={12} w={216} h={94} rounded={8} bg={conflict ? C.amberSoft : C.soft}>
        <I x={11} y={12} name="branch" size={16} color={conflict ? C.amber : C.violet} />
        <T x={35} y={10} w={165} text={conflict ? 'Слияние main' : 'feature/compact'} size={10} weight={650} />
        <T x={12} y={39} w={190} text={conflict ? '2 конфликта · 4 объединены' : '↑ 2 коммита   ↓ 1 входящий'} size={9} color={conflict ? C.amber : C.muted} />
        {!conflict && <Button x={12} y={61} w={192} h={24} text="Синхронизировать" icon="history" size={8.5} />}
        {conflict && <Pill x={12} y={62} w={144} h={22} text="Требуется решение" size={8} color={C.amber} bg={C.panel} />}
      </Frame>
      <SectionTitle x={14} y={128} text={conflict ? 'ОБЪЕКТЫ СЛИЯНИЯ' : 'ИЗМЕНЕНИЯ · 6'} right="6" />
      {conflict ? <>
        <GitChange y={151} icon="component" text="Карточка / Доходы" meta="2 конфликта свойств" selected />
        <GitChange y={199} icon="image" text="Иконка / Уведомления" meta="Удалена / изменена" type="deleted" />
        <GitChange y={247} icon="frame" text="Динамика" meta="Объединено автоматически" type="added" />
        <GitChange y={295} icon="type" text="Заголовок" meta="Объединено автоматически" type="added" />
      </> : <>
        <GitChange y={151} icon="component" text="Карточка / Доходы" meta="5 свойств · 88 → 76 px" selected />
        <GitChange y={199} icon="component" text="Карточка / Баланс" meta="3 свойства" />
        <GitChange y={247} icon="component" text="Карточка / Расходы" meta="3 свойства" />
        <GitChange y={295} icon="frame" text="Динамика" meta="Позиция · Y 204 → 180" />
        <GitChange y={343} icon="frame" text="Операции" meta="Позиция · Y 440 → 412" />
        <GitChange y={391} icon="component" text="Кнопка / Добавить" meta="Заливка · контраст" type="added" />
      </>}
      <SectionTitle x={14} y={458} text="ИСТОРИЯ ВЕТКИ" right="3" />
      <Rectangle x={24} y={492} w={1} h={207} bg={C.line} />
      {[['8f2c', 'Компактные карточки', 'сейчас', C.violet], ['a81f', 'Новая сетка обзора', '28 мин', C.blue], ['e04b', 'Синхронизация main', '2 ч', C.faint]].map(([hash, text, time, color], i) => <Frame x={12} y={485 + i * 72} w={216} h={62}>
        <Ellipse x={7} y={8} w={11} h={11} bg={color} stroke={C.panel} strokeWidth={2} />
        <T x={30} y={3} w={145} text={text} size={9.5} weight={i === 0 ? 650 : 500} />
        <T x={30} y={24} w={110} text={`${hash} · Вы`} size={8} color={C.muted} />
        <T x={171} y={24} w={38} text={time} size={8} color={C.faint} align="right" />
      </Frame>)}
      <StatusFooter text={conflict ? 'Слияние не завершено' : 'Git · рабочая копия чистая'} />
    </Frame>
  }

  function MiniDashboard({ x, y, compact = false, label, accent = C.blue }) {
    return <Frame name={`Версия / ${label}`} x={x} y={y} w={360} h={430} rounded={9} bg={C.white} shadow="0 8 24 #28342A12" overflow="hidden">
      <Rectangle x={0} y={0} w={76} h={430} bg="#F7F8F5" />
      <Rectangle x={14} y={18} w={15} h={15} rounded={4} bg={C.black} />
      <T x={35} y={18} w={35} text="пульс" size={9} weight={700} />
      {[0, 1, 2, 3].map(i => <Frame x={9} y={62 + i * 31} w={58} h={23} rounded={4} bg={i === 0 ? '#E8ECE6' : '#00000000'}><T x={7} y={6} w={46} text={['Обзор', 'Счета', 'Цели', 'Отчёт'][i]} size={6.5} color={i === 0 ? C.ink : C.muted} /></Frame>)}
      <T x={94} y={23} w={150} text="Добрый день, Анна" size={compact ? 11 : 12} weight={700} />
      <Rectangle x={282} y={18} w={60} h={23} rounded={5} bg={C.black} />
      <T x={282} y={25} w={60} text="+ Добавить" size={6.5} weight={600} color={C.white} align="center" />
      {[0, 1, 2].map(i => <Frame x={94 + i * 84} y={66} w={78} h={compact ? 54 : 62} rounded={6} bg={C.white} stroke={i === 1 ? accent : C.line} strokeWidth={i === 1 ? 1.5 : 1}>
        <T x={7} y={7} w={54} text={['Баланс', 'Доходы', 'Расходы'][i]} size={6} color={C.muted} />
        <T x={7} y={25} w={64} text={['248 320', '184 200', '96 480'][i]} size={compact ? 8 : 9} weight={700} />
        <T x={7} y={compact ? 40 : 46} w={45} text="₽" size={6} color={C.muted} />
      </Frame>)}
      <Frame x={94} y={compact ? 132 : 142} w={162} h={126} rounded={6} bg={C.white} stroke={C.line} strokeWidth={1}>
        <T x={9} y={9} w={80} text="Динамика" size={7} weight={650} />
        <T x={9} y={26} w={90} text="184 200 ₽" size={11} weight={700} />
        <svg x={9} y={55} size={140} viewBox="0 0 140 55"><path d="M0 46C20 40 20 45 37 31S62 36 76 19s31 9 64-15" fill="none" stroke={C.brandBlue} stroke-width="2" /></svg>
      </Frame>
      <Frame x={264} y={compact ? 132 : 142} w={78} h={126} rounded={6} bg="#202A25">
        <T x={8} y={9} w={60} text="Цель" size={7} weight={600} color={C.white} />
        <Ellipse x={19} y={42} w={40} h={40} bg="#3B4A41" />
        <T x={19} y={55} w={40} text="72%" size={9} weight={700} color={C.white} align="center" />
      </Frame>
      <Frame x={94} y={compact ? 270 : 282} w={248} h={126} rounded={6} bg={C.white} stroke={C.line} strokeWidth={1}>
        <T x={9} y={9} w={100} text="Последние операции" size={7} weight={650} />
        {[0, 1, 2].map(i => <Frame x={9} y={31 + i * 28} w={230} h={23}><Ellipse x={0} y={2} w={18} h={18} bg={C.soft} /><T x={27} y={3} w={110} text={['СберМаркет', 'Перевод от Ильи', 'Метро'][i]} size={6.5} /><T x={167} y={3} w={55} text={['−2 840 ₽', '+12 000 ₽', '−64 ₽'][i]} size={6.5} align="right" /></Frame>)}
      </Frame>
    </Frame>
  }

  function GitInspector() {
    return <Frame name="Семантический diff и коммит" x={1160} y={0} w={280} h={900} bg={C.panel}>
      <Frame x={0} y={0} w={280} h={69}>
        <I x={14} y={20} name="branch" size={17} color={C.amber} />
        <T x={42} y={15} w={190} text="Изменения на холсте" size={13} weight={700} />
        <T x={42} y={38} w={190} text="main…feature/compact · 6 объектов" size={9} color={C.muted} />
        <Rectangle x={0} y={68} w={280} h={1} bg={C.line} />
      </Frame>
      <SectionTitle x={14} y={87} w={250} text="ВЫБРАННЫЙ ОБЪЕКТ" right="Δ5" color={C.amber} />
      <Frame x={12} y={111} w={256} h={49} rounded={7} bg={C.amberSoft}>
        <I x={11} y={12} name="component" size={15} color={C.violet} />
        <T x={35} y={9} w={180} text="Карточка / Доходы" size={10} weight={650} />
        <T x={35} y={28} w={180} text="ID сохранён в обеих версиях" size={8} color={C.muted} />
      </Frame>
      {[['Высота', '88', '76 px'], ['Отступ', '16', '12 px'], ['Интервал', '12', '8 px'], ['Текст', '18', '16 px']].map(([label, before, after], i) => <Frame x={12} y={178 + i * 42} w={256} h={34}>
        <T x={0} y={9} w={90} text={label} size={9} color={C.muted} />
        <T x={103} y={9} w={45} text={before} size={9} color={C.faint} align="right" />
        <I x={156} y={9} name="arrow" size={12} color={C.faint} />
        <T x={180} y={9} w={65} text={after} size={9} weight={650} color={C.amber} align="right" />
      </Frame>)}
      <Rectangle x={12} y={354} w={256} h={1} bg={C.line} />
      <SectionTitle x={14} y={374} w={250} text="НОВЫЙ КОММИТ" />
      <Frame x={12} y={400} w={256} h={66} rounded={7} bg={C.soft}>
        <T x={11} y={11} w={230} text="Компактные карточки и новая сетка" size={10} weight={600} />
        <T x={11} y={36} w={230} text="6 объектов · без изменения компонентов" size={8.5} color={C.muted} />
      </Frame>
      <Frame x={12} y={479} w={256} h={88} rounded={7} bg={C.soft}>
        <I x={11} y={11} name="info" size={15} color={C.muted} />
        <T x={34} y={10} w={205} text="Коммит по смыслу" size={10} weight={650} />
        <T x={34} y={32} w={205} text="Список объектов войдёт в описание; файл .fig останется источником для Git." size={8.5} color={C.muted} lineHeight={12} />
      </Frame>
      <Button x={12} y={601} w={256} h={38} text="Коммит · 6 изменений" primary icon="branch" />
      <Button x={12} y={648} w={256} h={34} text="Создать ветку из изменений" icon="plus" />
      <SectionTitle x={14} y={711} w={250} text="СИНХРОНИЗАЦИЯ" />
      <Frame x={12} y={737} w={256} h={62} rounded={7} bg={C.blueSoft}>
        <T x={12} y={11} w={230} text="↑ 2 локальных   ↓ 1 входящий" size={10} weight={600} color={C.blue} />
        <T x={12} y={35} w={230} text="Перед pull откроется визуальное сравнение." size={8.5} color={C.muted} />
      </Frame>
      <T x={14} y={830} w={250} text="Локально · без обязательного сервера" size={8.5} color={C.muted} align="center" />
    </Frame>
  }

  function Screen04() {
    return <Frame name="04 — Git и история" x={0} y={1000} w={1440} h={900} bg={C.canvas} overflow="hidden">
      <Shell active="git" git branch="feature/compact · 6 изменений" left={<GitPanel />} right={<GitInspector />}>
        <Frame name="Режимы Git-сравнения" x={570} y={76} w={260} h={32} rounded={7} bg={C.panel} stroke={C.line} strokeWidth={1}>
          <T x={8} y={9} w={70} text="Рабочая" size={9} color={C.muted} align="center" />
          <T x={84} y={9} w={58} text="main" size={9} color={C.muted} align="center" />
          <Frame x={148} y={4} w={103} h={24} rounded={5} bg={C.amberSoft}><T x={0} y={6} w={103} text="Сравнение" size={9} weight={650} color={C.amber} align="center" /></Frame>
        </Frame>
        <Pill x={282} y={139} w={150} h={25} text="main · e04b" icon="branch" size={9} color={C.muted} bg={C.panel} />
        <Pill x={760} y={139} w={202} h={25} text="Рабочая · не закоммичено" icon="branch" size={9} color={C.amber} bg={C.amberSoft} />
        <MiniDashboard x={280} y={180} label="main" accent={C.faint} />
        <MiniDashboard x={760} y={180} compact label="Рабочая" accent={C.amber} />
        <I x={690} y={372} name="arrow" size={26} color={C.amber} />
        <Pill x={632} y={628} w={136} h={28} text="6 объектов изменено" size={9} color={C.amber} bg={C.amberSoft} />
        <Frame x={391} y={701} w={618} h={67} rounded={8} bg={C.panel} stroke={C.line} strokeWidth={1}>
          <I x={13} y={13} name="link" size={16} color={C.blue} />
          <T x={40} y={11} w={550} text="Сравнение привязано к объектам, а не к пиксельным снимкам" size={10} weight={650} />
          <T x={40} y={34} w={550} text="Выберите Δ на холсте или в списке — откроются конкретные свойства и исходные значения." size={9} color={C.muted} />
        </Frame>
      </Shell>
    </Frame>
  }

  function ConflictCard({ x, y, label, sublabel, h, pad, accent, selected = false }) {
    return <Frame name={`Конфликт / ${label}`} x={x} y={y} w={250} h={182}>
      <T x={0} y={0} w={250} text={label} size={10} weight={650} color={accent} align="center" />
      <T x={0} y={20} w={250} text={sublabel} size={8} color={C.muted} align="center" />
      <Frame x={0} y={45} w={250} h={137} rounded={9} bg={C.white} stroke={selected ? accent : C.line} strokeWidth={selected ? 2 : 1} shadow="0 6 18 #28342A10">
        <Frame x={20} y={18} w={210} h={h} rounded={8} bg={C.white} stroke={accent} strokeWidth={1.2}>
          <T x={pad} y={pad} w={100} text="Доходы" size={9} color={C.muted} />
          <T x={pad} y={pad + 23} w={150} text="184 200 ₽" size={h > 80 ? 18 : 16} weight={700} />
          <Pill x={150} y={pad} w={45} h={18} text="+12,4%" size={7} color={C.green} bg={C.greenSoft} />
        </Frame>
        <T x={20} y={116} w={210} text={`H ${h} · отступ ${pad}`} size={8} color={accent} align="center" />
      </Frame>
    </Frame>
  }

  function ConflictInspector() {
    return <Frame name="Разрешение конфликта" x={1160} y={0} w={280} h={900} bg={C.panel}>
      <Frame x={0} y={0} w={280} h={70}>
        <I x={14} y={20} name="branch" size={18} color={C.amber} />
        <T x={42} y={15} w={190} text="Конфликт свойств" size={13} weight={700} />
        <T x={42} y={38} w={190} text="Карточка / Доходы · 1 из 2" size={9} color={C.muted} />
        <Rectangle x={0} y={69} w={280} h={1} bg={C.line} />
      </Frame>
      <Frame x={12} y={84} w={256} h={55} rounded={7} bg={C.amberSoft}>
        <I x={11} y={11} name="info" size={15} color={C.amber} />
        <T x={34} y={10} w={205} text="Выбор по свойствам" size={10} weight={650} color={C.amber} />
        <T x={34} y={31} w={205} text="Не нужно принимать объект целиком." size={8.5} color={C.muted} />
      </Frame>
      <SectionTitle x={14} y={162} w={250} text="ВЫСОТА" right="1 / 2" color={C.amber} />
      <Frame x={12} y={187} w={124} h={66} rounded={7} bg={C.greenSoft} stroke={C.green} strokeWidth={1.2}>
        <Ellipse x={11} y={12} w={13} h={13} bg={C.green} /><I x={12} y={13} name="check" size={11} color={C.white} />
        <T x={32} y={10} w={75} text="Моя · 76" size={9} weight={650} color={C.green} />
        <T x={12} y={38} w={100} text="Компактная" size={8} color={C.muted} />
      </Frame>
      <Frame x={144} y={187} w={124} h={66} rounded={7} bg={C.panel} stroke={C.line} strokeWidth={1}>
        <Ellipse x={11} y={12} w={13} h={13} bg={C.white} stroke={C.faint} strokeWidth={1} />
        <T x={32} y={10} w={75} text="Вход. · 88" size={9} weight={650} />
        <T x={12} y={38} w={100} text="Просторная" size={8} color={C.muted} />
      </Frame>
      <SectionTitle x={14} y={279} w={250} text="ОТСТУП" right="2 / 2" color={C.amber} />
      <Frame x={12} y={304} w={124} h={66} rounded={7} bg={C.panel} stroke={C.line} strokeWidth={1}>
        <Ellipse x={11} y={12} w={13} h={13} bg={C.white} stroke={C.faint} strokeWidth={1} />
        <T x={32} y={10} w={75} text="Моя · 12" size={9} weight={650} />
        <T x={12} y={38} w={100} text="Меньше" size={8} color={C.muted} />
      </Frame>
      <Frame x={144} y={304} w={124} h={66} rounded={7} bg={C.blueSoft} stroke={C.blue} strokeWidth={1.2}>
        <Ellipse x={11} y={12} w={13} h={13} bg={C.blue} /><I x={12} y={13} name="check" size={11} color={C.white} />
        <T x={32} y={10} w={75} text="Вход. · 16" size={9} weight={650} color={C.blue} />
        <T x={12} y={38} w={100} text="Больше" size={8} color={C.muted} />
      </Frame>
      <Frame x={12} y={392} w={256} h={89} rounded={7} bg={C.soft}>
        <T x={12} y={11} w={230} text="Результат: H 76 · отступ 16" size={10} weight={650} />
        <T x={12} y={35} w={230} text="Новая комбинация проверена на холсте до завершения merge." size={8.5} color={C.muted} lineHeight={12} />
        <Pill x={12} y={60} w={118} h={20} text="Нет потери данных" size={7.5} color={C.green} bg={C.greenSoft} />
      </Frame>
      <SectionTitle x={14} y={508} w={250} text="СЛЕДУЮЩИЙ КОНФЛИКТ" right="2" />
      <Frame x={12} y={533} w={256} h={77} rounded={7} bg="#FCEDEA">
        <I x={11} y={11} name="trash" size={15} color={C.red} />
        <T x={34} y={9} w={205} text="Иконка / Уведомления" size={9.5} weight={650} />
        <T x={34} y={29} w={205} text="Удалена в main, изменена в ветке" size={8} color={C.muted} />
        <T x={34} y={52} w={90} text="Удалить" size={8.5} weight={600} color={C.red} />
        <T x={148} y={52} w={90} text="Восстановить" size={8.5} weight={600} color={C.blue} align="right" />
      </Frame>
      <Button x={12} y={647} w={256} h={36} text="Применить к следующему" icon="arrow" />
      <Button x={12} y={700} w={256} h={40} text="Завершить слияние" primary icon="check" disabled />
      <T x={14} y={758} w={250} text="Кнопка активируется после решения всех конфликтов." size={8.5} color={C.muted} align="center" />
      <Button x={12} y={804} w={256} h={32} text="Прервать слияние" size={9} />
    </Frame>
  }

  function Screen05() {
    return <Frame name="05 — Конфликт и слияние" x={1520} y={1000} w={1440} h={900} bg={C.canvas} overflow="hidden">
      <Shell active="git" git branch="merge/main → feature/compact" left={<GitPanel conflict />} right={<ConflictInspector />}>
        <T x={282} y={85} w={640} text="ТРЕХСТОРОННЕЕ СРАВНЕНИЕ · КАРТОЧКА / ДОХОДЫ" size={9} weight={650} color={C.amber} letterSpacing={0.4} />
        <ConflictCard x={272} y={121} label="Общая основа" sublabel="main · a81f" h={88} pad={16} accent={C.muted} />
        <ConflictCard x={574} y={121} label="Моя ветка" sublabel="feature/compact" h={72} pad={12} accent={C.green} selected />
        <ConflictCard x={876} y={121} label="Входящая" sublabel="main · e04b" h={88} pad={16} accent={C.blue} selected />
        <I x={533} y={204} name="plus" size={16} color={C.faint} />
        <I x={835} y={204} name="arrow" size={18} color={C.amber} />
        <Frame name="Предпросмотр результата" x={390} y={352} w={620} h={330} rounded={10} bg={C.panel} stroke={C.line} strokeWidth={1}>
          <T x={18} y={15} w={360} text="РЕЗУЛЬТАТ · НОВАЯ КОМБИНАЦИЯ СВОЙСТВ" size={9} weight={650} color={C.amber} />
          <Pill x={474} y={10} w={128} h={24} text="2 решения приняты" size={8} color={C.green} bg={C.greenSoft} />
          <Frame x={72} y={65} w={476} h={151} rounded={10} bg={C.white} stroke={C.amber} strokeWidth={1.5} shadow="0 5 16 #28342A0C">
            <T x={24} y={20} w={120} text="Доходы" size={11} color={C.muted} />
            <T x={24} y={52} w={250} text="184 200 ₽" size={26} weight={700} />
            <Pill x={359} y={20} w={88} h={25} text="+12,4%" size={9} color={C.green} bg={C.greenSoft} />
            <T x={24} y={104} w={300} text="+20 400 ₽ за этот месяц" size={10} color={C.green} />
          </Frame>
          <Pill x={225} y={232} w={170} h={26} text="H 76 · отступ 16" size={9} color={C.amber} bg={C.amberSoft} />
          <T x={46} y={280} w={528} text="Предпросмотр обновляется при каждом выборе; Git-файл меняется только после «Завершить слияние»." size={9} color={C.muted} align="center" />
        </Frame>
        <Frame x={440} y={719} w={520} h={59} rounded={8} bg={C.greenSoft}>
          <I x={13} y={12} name="check" size={16} color={C.green} />
          <T x={40} y={10} w={450} text="4 объекта уже объединены автоматически" size={10} weight={650} color={C.green} />
          <T x={40} y={32} w={450} text="Их непересекающиеся свойства не требуют ручного решения." size={8.5} color={C.muted} />
        </Frame>
      </Shell>
    </Frame>
  }

  return <>
    <Screen01 />
    <Screen02 />
    <Screen03 />
    <Screen04 />
    <Screen05 />
  </>
})()}
