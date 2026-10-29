<Frame name="Малевич / Лендинг" x={0} y={0} w={1092} h={1440} bg="#F5F1EB" overflow="hidden">
{(() => {
const C = {
  ink: '#161616', red: '#E24832', blue: '#2D63A8', yellow: '#E5B636',
  paper: '#F5F1EB', white: '#FFFFFF', muted: '#68645E', line: '#DDD8CF',
  dark: '#181818', panel: '#222222', sidebar: '#1C1C1C', soft: '#ECE8E1'
}

function T({ x, y, w, text, size = 12, color = C.ink, weight = 400, align = 'left', lineHeight, font = 'Inter', name = 'Текст', letterSpacing = 0 }) {
  return <Text name={name} x={x} y={y} w={w} font={font} size={size} weight={weight} color={color} textAlign={align} textAutoResize="height" lineHeight={lineHeight ?? size * 1.35} letterSpacing={letterSpacing}>{text}</Text>
}

function Mark({ x, y, s = 1 }) {
  return <Frame name="Знак Малевич" x={x} y={y} w={160 * s} h={150 * s}>
    <Frame name="Чёрный холст" x={8 * s} y={10 * s} w={100 * s} h={100 * s} rotate={-12}>
      <Rectangle w={100 * s} h={100 * s} bg={C.ink} />
      <svg x={10 * s} y={10 * s} size={80 * s} viewBox="0 0 100 100"><path d="M15 10 H31 L50 43 L69 10 H85 V90 H68 V43 L50 72 L32 43 V90 H15 Z" fill="#FFFFFF" /></svg>
    </Frame>
    <Rectangle name="Синяя панель" x={0} y={116 * s} w={90 * s} h={25 * s} rotate={-12} bg={C.blue} />
    <Rectangle name="Красная панель" x={112 * s} y={0} w={42 * s} h={126 * s} rotate={12} bg={C.red} />
  </Frame>
}

function HeroArt({ x, y, s = 1 }) {
  return <Frame name="Композиция Малевича" x={x} y={y} w={480 * s} h={400 * s}>
    <Rectangle name="Линия построения 1" x={82 * s} y={16 * s} w={1 * s} h={340 * s} rotate={-13} bg="#BDB8AF" />
    <Rectangle name="Линия построения 2" x={10 * s} y={306 * s} w={440 * s} h={1 * s} rotate={-13} bg="#BDB8AF" />
    <Rectangle name="Линия построения 3" x={235 * s} y={25 * s} w={1 * s} h={310 * s} rotate={77} bg="#D2CDC4" />
    <Rectangle name="Линия построения 4" x={80 * s} y={212 * s} w={360 * s} h={1 * s} rotate={-13} bg="#D2CDC4" />
    <Frame name="Холст с M" x={60 * s} y={70 * s} w={240 * s} h={240 * s} rotate={-13}>
      <Rectangle w={240 * s} h={240 * s} bg={C.ink} />
      <svg x={20 * s} y={20 * s} size={200 * s} viewBox="0 0 100 100"><path d="M15 10 H31 L50 43 L69 10 H85 V90 H68 V43 L50 72 L32 43 V90 H15 Z" fill="#FFFFFF" /></svg>
    </Frame>
    <Rectangle name="Красная форма" x={292 * s} y={35 * s} w={100 * s} h={210 * s} rotate={-13} bg={C.red} />
    <Rectangle name="Синяя форма" x={140 * s} y={285 * s} w={176 * s} h={45 * s} rotate={-13} bg={C.blue} />
    <Rectangle name="Жёлтая форма" x={320 * s} y={275 * s} w={75 * s} h={75 * s} rotate={-13} bg={C.yellow} />
  </Frame>
}

function FeatureIcon({ x, y, color }) {
  return <Frame name="Иконка преимущества" x={x} y={y} w={34} h={34}>
    <Rectangle name="Цветной квадрат" x={13} y={0} w={21} h={21} bg={color} />
    <Rectangle name="Чёрная вертикаль" x={0} y={13} w={9} h={21} bg={C.ink} />
    <Rectangle name="Чёрная горизонталь" x={0} y={25} w={22} h={9} bg={C.ink} />
  </Frame>
}

function EditorMockup({ x, y }) {
  const tree = [
    ['Главная', 72, 0], ['Навигация', 94, 12], ['Герой', 116, 12], ['Заголовок', 138, 24],
    ['Описание', 160, 36], ['Кнопки', 182, 36], ['Иллюстрация', 204, 36],
    ['Преимущества', 226, 24], ['Секции', 248, 24], ['Футер', 270, 24]
  ]
  return <Frame name="Мокап редактора Малевич" x={x} y={y} w={725} h={362} rounded={12} bg={C.panel} overflow="hidden">
    <Rectangle name="Верхняя панель" w={725} h={34} bg="#242424" />
    <Ellipse name="Закрыть" x={12} y={13} w={7} h={7} bg="#EF5B50" />
    <Ellipse name="Свернуть" x={24} y={13} w={7} h={7} bg="#E8B93D" />
    <Ellipse name="Развернуть" x={36} y={13} w={7} h={7} bg="#5FBF5A" />
    <T x={268} y={10} w={180} size={8} color="#C9C9C9" align="center" text="Главная  /  Малевич" />
    <Rectangle name="Поделиться" x={576} y={7} w={58} h={20} rounded={5} bg="#3169B3" />
    <T x={576} y={12} w={58} size={7} color={C.white} align="center" text="Поделиться" />
    <T x={665} y={10} w={40} size={8} color="#D5D5D5" align="center" text="100%" />

    <Frame name="Панель слоёв" x={0} y={34} w={132} h={328} bg={C.sidebar}>
      <T x={12} y={12} w={40} size={8} color="#E5E5E5" text="Слои" />
      <T x={59} y={12} w={50} size={8} color="#777777" text="Ресурсы" />
      <Rectangle x={12} y={35} w={108} h={20} rounded={4} bg="#292929" />
      <T x={22} y={41} w={70} size={7} color="#777777" text="Поиск" />
      {tree.map(([label, top, left]) => <T x={12 + left} y={top} w={102 - left} size={7.5} color={label === 'Заголовок' ? C.white : '#B9B9B9'} text={label} />)}
      <Rectangle name="Выбранный слой" x={0} y={132} w={132} h={21} bg="#2867B2" />
      <T x={36} y={138} w={80} size={7.5} color={C.white} text="Заголовок" />
    </Frame>

    <Frame name="Холст" x={132} y={34} w={456} h={328} bg={C.paper}>
      <Mark x={14} y={10} s={0.12} />
      <T x={37} y={14} w={60} size={8} weight={800} text="Малевич" />
      <T x={176} y={16} w={110} size={5.5} color={C.muted} text="Продукт    Возможности    Цены" />
      <Rectangle x={374} y={10} w={58} h={18} rounded={5} bg={C.ink} />
      <T x={374} y={15} w={58} size={6} color={C.white} align="center" text="Скачать" />
      <T x={34} y={92} w={238} size={28} weight={800} lineHeight={29} letterSpacing={-1.3} text={'Интерфейсы\nбез лишнего'} />
      <Rectangle name="Выделение заголовка" x={26} y={86} w={240} h={91} bg="#00000000" stroke="#4B91E2" strokeWidth={1} />
      <Rectangle x={24} y={84} w={4} h={4} bg={C.white} stroke="#4B91E2" strokeWidth={1} />
      <Rectangle x={264} y={84} w={4} h={4} bg={C.white} stroke="#4B91E2" strokeWidth={1} />
      <Rectangle x={24} y={175} w={4} h={4} bg={C.white} stroke="#4B91E2" strokeWidth={1} />
      <Rectangle x={264} y={175} w={4} h={4} bg={C.white} stroke="#4B91E2" strokeWidth={1} />
      <Rectangle x={34} y={197} w={102} h={26} rounded={5} bg={C.red} />
      <T x={34} y={205} w={102} size={7} color={C.white} align="center" text="Начать бесплатно" />
      <Rectangle x={145} y={197} w={92} h={26} rounded={5} bg={C.white} stroke={C.line} strokeWidth={1} />
      <T x={145} y={205} w={92} size={7} align="center" text="▶  Смотреть видео" />
      <HeroArt x={270} y={86} s={0.37} />
      <Ellipse x={35} y={246} w={16} h={16} bg="#A98D7A" />
      <Ellipse x={45} y={246} w={16} h={16} bg="#5E6B72" />
      <Ellipse x={55} y={246} w={16} h={16} bg={C.ink} />
      <T x={78} y={246} w={170} size={6} color={C.muted} text="Уже с нами более 10 000 дизайнеров\nи продуктовых команд" />
    </Frame>

    <Frame name="Инспектор" x={588} y={34} w={137} h={328} bg="#202020">
      <T x={10} y={12} w={38} size={7} color={C.white} text="Дизайн" />
      <T x={52} y={12} w={45} size={7} color="#777777" text="Прототип" />
      <T x={103} y={12} w={25} size={7} color="#777777" text="Код" />
      <T x={10} y={40} w={70} size={7.5} color="#D7D7D7" text="Рамка" />
      <Rectangle x={10} y={61} w={55} h={20} rounded={4} bg="#2A2A2A" />
      <Rectangle x={73} y={61} w={54} h={20} rounded={4} bg="#2A2A2A" />
      <T x={16} y={67} w={45} size={7} color="#C9C9C9" text="X  120" />
      <T x={79} y={67} w={43} size={7} color="#C9C9C9" text="Y  80" />
      <Rectangle x={10} y={87} w={55} h={20} rounded={4} bg="#2A2A2A" />
      <Rectangle x={73} y={87} w={54} h={20} rounded={4} bg="#2A2A2A" />
      <T x={16} y={93} w={45} size={7} color="#C9C9C9" text="W  640" />
      <T x={79} y={93} w={43} size={7} color="#C9C9C9" text="H  240" />
      <T x={10} y={130} w={90} size={7.5} color="#D7D7D7" text="Автолейаут" />
      <Rectangle x={10} y={151} w={117} h={42} rounded={4} bg="#292929" />
      <T x={18} y={160} w={100} size={7} color="#AAAAAA" text="↔  24     ↕  24" />
      <T x={10} y={216} w={90} size={7.5} color="#D7D7D7" text="Оформление" />
      <Rectangle x={10} y={238} w={117} h={20} rounded={4} bg="#2A2A2A" />
      <T x={16} y={244} w={100} size={7} color="#C9C9C9" text="□  100%     ○  20" />
      <T x={10} y={280} w={50} size={7.5} color="#D7D7D7" text="Текст" />
      <Rectangle x={10} y={301} w={117} h={20} rounded={4} bg="#2A2A2A" />
      <T x={16} y={307} w={100} size={7} color="#C9C9C9" text="Inter     Bold     72" />
    </Frame>
  </Frame>
}

function Dashboard({ x, y }) {
  const bars = [28, 44, 36, 58, 49, 72, 62, 82, 68]
  return <Frame name="Мокап кабинета" x={x} y={y} w={260} h={170} rounded={14} bg={C.white} shadow="0 14 30 #16161620" overflow="hidden">
    <Rectangle name="Верхняя панель" w={260} h={24} bg="#FAFAFA" />
    <Mark x={7} y={4} s={0.075} />
    <T x={22} y={8} w={48} size={5.5} weight={700} text="Малевич" />
    <T x={86} y={8} w={100} size={5} color={C.muted} text="Обзор проекта     Документы" />
    <Rectangle x={220} y={5} w={30} h={14} rounded={4} bg={C.ink} />
    <Frame name="Навигация кабинета" x={0} y={24} w={61} h={146} bg="#F7F7F7">
      {['Обзор', 'Проекты', 'Команда', 'Компоненты', 'Стили', 'Настройки'].map((label, i) => <T x={10} y={14 + i * 20} w={46} size={5.5} color={i === 0 ? C.ink : C.muted} weight={i === 0 ? 700 : 400} text={label} />)}
    </Frame>
    <T x={74} y={38} w={90} size={8} weight={700} text="Сводка проекта" />
    <T x={74} y={57} w={65} size={5.5} color={C.muted} text="Активность" />
    <Rectangle x={74} y={69} w={103} h={55} rounded={5} bg="#F4F6F8" />
    {bars.map((h, i) => <Rectangle x={80 + i * 10} y={116 - h * 0.55} w={5} h={h * 0.55} rounded={1} bg={i % 3 === 0 ? '#86A9D0' : '#C0D1E4'} />)}
    <T x={192} y={57} w={48} size={5.5} color={C.muted} text="Палитра" />
    <Rectangle x={192} y={69} w={22} h={22} rounded={3} bg={C.ink} />
    <Rectangle x={218} y={69} w={22} h={22} rounded={3} bg={C.red} />
    <Rectangle x={192} y={96} w={22} h={22} rounded={3} bg="#8FAFD0" />
    <Rectangle x={218} y={96} w={22} h={22} rounded={3} bg={C.yellow} />
    <Rectangle x={74} y={136} w={166} h={1} bg={C.line} />
    <T x={74} y={145} w={80} size={5.5} color={C.muted} text="12 экранов   •   48 компонентов" />
  </Frame>
}

return <>
  <Frame name="Hero и навигация" x={0} y={0} w={1092} h={567} bg={C.paper}>
    <Mark x={45} y={12} s={0.25} />
    <T x={94} y={24} w={130} size={22} weight={800} letterSpacing={-0.8} text="Малевич" name="Логотип / словесный знак" />
    <T x={331} y={31} w={86} size={9.5} text="Возможности" />
    <T x={418} y={31} w={65} size={9.5} text="Для команд" />
    <T x={491} y={31} w={35} size={9.5} text="Цены" />
    <T x={541} y={31} w={85} size={9.5} text="Документация" />
    <T x={630} y={31} w={35} size={9.5} text="Блог" />
    <svg name="Поиск" x={862} y={29} size={14} viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#161616" strokeWidth="1.8" /><path d="M15.5 15.5 L21 21" fill="none" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" /></svg>
    <T x={910} y={31} w={40} size={10} text="Войти" />
    <Rectangle name="Скачать / навигация" x={963} y={18} w={87} h={30} rounded={8} bg={C.ink} />
    <T x={963} y={27} w={87} size={10} color={C.white} align="center" text="Скачать" />

    <T x={64} y={106} w={475} size={62} weight={800} lineHeight={63} letterSpacing={-3.2} text={'Интерфейсы\nбез лишнего'} name="Заголовок hero" />
    <T x={66} y={265} w={420} size={14} lineHeight={21} color={C.muted} text={'Малевич — редактор интерфейсов нового поколения.\nСоздавайте, редактируйте и развивайте продукты\nвместе с ИИ-агентами.'} />
    <Rectangle name="Скачать для macOS" x={66} y={347} w={195} h={42} rounded={9} bg={C.ink} />
    <T x={86} y={360} w={156} size={12} color={C.white} align="center" text="  Скачать для macOS" />
    <svg name="Apple" x={84} y={358} size={17} viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.52.07 2.59.84 3.5.9 1.11-.23 2.17-1.02 3.7-.92 1.75.14 3.07.83 3.94 2.09-3.61 2.16-2.75 6.9.61 8.59-.63 1.51-1.45 3.01-2.75 4.31M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.31-2.11 4.56-3.74 4.25" fill="#FFFFFF" /></svg>
    <Rectangle name="Смотреть видео" x={276} y={347} w={174} h={42} rounded={9} bg={C.white} stroke="#E5E0D8" strokeWidth={1} />
    <T x={292} y={360} w={144} size={12} align="center" text="▶  Смотреть видео" />
    <T x={66} y={400} w={230} size={9.5} color="#8B867E" text="Также доступно для Windows и Linux" />
    <Rectangle x={157} y={409} w={76} h={1} bg="#B9B3AA" />

    <HeroArt x={535} y={62} />
    <Rectangle x={955} y={236} w={35} h={2} bg={C.ink} />
    <T x={970} y={263} w={105} size={14} lineHeight={20} text={'Простые\nформы.\nБольшие\nвозможности.'} />
    <Rectangle x={955} y={369} w={63} h={2} rotate={-5} bg={C.ink} />

    <FeatureIcon x={49} y={468} color={C.ink} />
    <T x={95} y={479} w={180} size={14} weight={700} text="Только интерфейсы" />
    <T x={95} y={505} w={190} size={11} lineHeight={17} color={C.muted} text={'Фокус на цифровых продуктах.\nНичего лишнего.'} />
    <FeatureIcon x={306} y={468} color={C.red} />
    <T x={365} y={479} w={160} size={14} weight={700} text="ИИ-агенты" />
    <T x={365} y={505} w={190} size={11} lineHeight={17} color={C.muted} text={'Создавайте макеты с помощью\nCodex и других агентов.'} />
    <FeatureIcon x={573} y={468} color={C.blue} />
    <T x={627} y={479} w={160} size={14} weight={700} text="Для команд" />
    <T x={627} y={505} w={190} size={11} lineHeight={17} color={C.muted} text={'Совместная работа\nв реальном времени.'} />
    <FeatureIcon x={827} y={468} color={C.yellow} />
    <T x={889} y={479} w={190} size={14} weight={700} text="Нативное приложение" />
    <T x={889} y={505} w={185} size={11} lineHeight={17} color={C.muted} text={'Быстро, стабильно\nи удобно на всех платформах.'} />
  </Frame>

  <Frame name="Рабочее пространство" x={0} y={567} w={1092} h={383} bg={C.dark} overflow="hidden">
    <T x={48} y={68} w={287} size={24} weight={700} lineHeight={31} color={C.white} letterSpacing={-0.8} text={'Знакомое\nрабочее пространство.\nНовые возможности'} />
    <T x={48} y={177} w={255} size={13} lineHeight={22} color="#C8C8C8" text={'Все инструменты для создания\nсовременных интерфейсов:\nкомпоненты, стили, варианты,\nавтолейауты, прототипы и многое\nдругое.'} />
    <Rectangle name="Посмотреть в действии" x={48} y={305} w={186} h={39} rounded={9} bg={C.red} />
    <T x={48} y={317} w={186} size={12} color={C.white} align="center" text="Посмотреть в действии" />
    <EditorMockup x={335} y={21} />
  </Frame>

  <Frame name="Создавайте с ИИ" x={0} y={950} w={1092} h={361} bg={C.paper} overflow="hidden">
    <Rectangle name="Фоновая панель" x={56} y={165} w={150} h={145} bg="#00000000" stroke={C.line} strokeWidth={1} />
    <Rectangle name="Красная форма / AI" x={94} y={47} w={96} h={139} rotate={-10} bg={C.red} />
    <Rectangle name="Синяя форма / AI" x={80} y={173} w={181} h={54} rotate={-10} bg={C.blue} />
    <Rectangle name="Жёлтая форма / AI" x={272} y={245} w={55} h={55} rotate={-10} bg={C.yellow} />
    <Frame name="Карточка ИИ-агента" x={207} y={30} w={222} h={258} rounded={15} bg="#1D1D1D" shadow="0 12 28 #16161624">
      <Rectangle x={14} y={13} w={15} h={15} rounded={4} bg="#3B3B3B" />
      <T x={36} y={14} w={110} size={11} weight={700} color={C.white} text="ИИ-агент" />
      <Frame name="Запрос" x={12} y={42} w={198} h={78} rounded={8} bg="#2B2B2B">
        <T x={12} y={12} w={174} size={10.5} lineHeight={16} color="#EEEEEE" text={'Создай экран кабинета\nпользователя в стиле нашего\nприложения'} />
      </Frame>
      <T x={15} y={135} w={130} size={10} color="#D6D6D6" text="✦  Создание…" />
      <T x={15} y={170} w={160} size={8} color="#777777" text="Анализирую стили проекта" />
      <Rectangle x={15} y={190} w={176} h={1} bg="#393939" />
      <T x={15} y={203} w={160} size={8} color="#777777" text="Собираю экран и компоненты" />
    </Frame>
    <Dashboard x={218} y={168} />

    <T x={528} y={60} w={350} size={28} weight={700} letterSpacing={-0.8} text="Создавайте с ИИ" />
    <T x={528} y={102} w={385} size={13} lineHeight={20} color={C.muted} text={'Опишите идею — и агент создаст макет, предложит\nварианты, добавит компоненты и подготовит прототип.\nВы управляете, дополняете и развиваете.'} />
    <Ellipse x={531} y={182} w={24} h={24} bg={C.yellow} />
    <T x={531} y={185} w={24} size={15} align="center" text="ϟ" />
    <T x={584} y={185} w={300} size={12} text="Работа с Codex и другими агентами" />
    <Rectangle x={537} y={220} w={13} h={13} bg={C.ink} />
    <T x={584} y={219} w={300} size={12} text="Генерация экранов и компонентов" />
    <Rectangle x={537} y={255} w={13} h={13} bg={C.red} />
    <T x={584} y={254} w={300} size={12} text="Редактирование по запросу" />
    <Rectangle x={537} y={290} w={13} h={13} bg={C.blue} />
    <T x={584} y={289} w={300} size={12} text="Сохранение в проекте" />
    <svg x={876} y={200} width={80} height={60} viewBox="0 0 80 60"><path d="M72 8 C48 4 20 19 8 46 M8 46 L9 30 M8 46 L25 42" fill="none" stroke="#161616" strokeWidth="1.6" strokeLinecap="round" /></svg>
    <T x={939} y={226} w={125} size={20} lineHeight={24} font="SignPainter" text={'Быстрее\nот идеи\nк результату'} name="Рукописная заметка" />
    <Rectangle x={963} y={309} w={50} h={1.5} rotate={-12} bg={C.ink} />
  </Frame>

  <Frame name="Возможности продукта" x={0} y={1311} w={1092} h={129} bg={C.paper}>
    <Rectangle x={0} y={0} w={1092} h={1} bg={C.line} />
    <FeatureIcon x={43} y={27} color={C.yellow} />
    <T x={105} y={27} w={185} size={13} weight={700} text="Компоненты и стили" />
    <T x={105} y={55} w={185} size={10} lineHeight={15} color={C.muted} text={'Создавайте дизайн-системы\nи поддерживайте их в актуальном\nсостоянии.'} />
    <FeatureIcon x={314} y={27} color={C.blue} />
    <T x={378} y={27} w={170} size={13} weight={700} text="Прототипы" />
    <T x={378} y={55} w={175} size={10} lineHeight={15} color={C.muted} text={'Интерактивные макеты\nдля тестирования идей\nи согласования с командой.'} />
    <FeatureIcon x={563} y={27} color={C.red} />
    <T x={628} y={27} w={190} size={13} weight={700} text="Совместная работа" />
    <T x={628} y={55} w={190} size={10} lineHeight={15} color={C.muted} text={'Комментарии, статусы и история\nизменений. Всё, чтобы двигаться\nвместе.'} />
    <FeatureIcon x={832} y={27} color={C.ink} />
    <T x={890} y={27} w={185} size={13} weight={700} text="Экспорт и разработка" />
    <T x={890} y={55} w={185} size={10} lineHeight={15} color={C.muted} text={'Удобный экспорт, готовые токены\nи документация для разработчиков.'} />
  </Frame>
</>
})()}
</Frame>
