<Frame name="Malewich / Логотип — презентация концептов" x={0} y={0} w={1448} h={1086} bg="#F5F1EB" overflow="hidden">
{(() => {
const C = {
  ink: '#161616',
  red: '#D94A38',
  blue: '#2D63A8',
  yellow: '#E5B636',
  paper: '#F5F1EB',
  neutral: '#C9C5BB',
  muted: '#6D6A64',
  line: '#DCD7CF',
  white: '#FFFFFF'
}

function Word({ x, y, size = 56, color = C.ink, name = 'Словесный знак' }) {
  return <Text name={name} x={x} y={y} font="Inter" size={size} weight={800} letterSpacing={-size * 0.045} color={color}>Malewich</Text>
}

function Mark1({ x, y, s = 1, inverse = false, name = 'Знак / Интерфейсная композиция' }) {
  return <Frame name={name} x={x} y={y} w={160 * s} h={150 * s}>
    <Frame name="Холст с буквой M" x={8 * s} y={10 * s} w={100 * s} h={100 * s} rotate={-12}>
      <Rectangle name="Холст" w={100 * s} h={100 * s} bg={C.ink} />
      <svg name="Буква M" x={10 * s} y={10 * s} size={80 * s} viewBox="0 0 100 100"><path d="M15 10 H31 L50 43 L69 10 H85 V90 H68 V43 L50 72 L32 43 V90 H15 Z" fill="#FFFFFF" /></svg>
    </Frame>
    <Rectangle name="Нижняя панель" x={0} y={116 * s} w={90 * s} h={25 * s} rotate={-12} bg={C.blue} />
    <Rectangle name="Боковая панель" x={112 * s} y={0} w={42 * s} h={126 * s} rotate={12} bg={C.red} />
  </Frame>
}

function Mark2({ x, y, s = 1, inverse = false, name = 'Знак / Кадр и слои' }) {
  return <Frame name={name} x={x} y={y} w={124 * s} h={120 * s}>
    <Rectangle name="Основной кадр" x={0} y={0} w={74 * s} h={76 * s} bg={inverse ? C.white : C.ink} />
    <Rectangle name="Правый слой" x={78 * s} y={0} w={42 * s} h={76 * s} bg={C.red} />
    <Rectangle name="Нижний слой" x={0} y={80 * s} w={80 * s} h={36 * s} bg={C.blue} />
    <Rectangle name="Дополнительный слой" x={84 * s} y={80 * s} w={36 * s} h={36 * s} bg={C.yellow} />
  </Frame>
}

function Mark3({ x, y, s = 1, inverse = false, name = 'Знак / Динамическая форма' }) {
  return <Frame name={name} x={x} y={y} w={160 * s} h={170 * s}>
    <Rectangle name="Динамический кадр" x={8 * s} y={50 * s} w={84 * s} h={84 * s} rotate={27} bg={inverse ? C.white : C.ink} />
    <Rectangle name="Красный акцент" x={62 * s} y={0} w={40 * s} h={126 * s} rotate={-42} bg={C.red} />
    <Rectangle name="Синий акцент" x={88 * s} y={118 * s} w={34 * s} h={58 * s} rotate={42} bg={C.blue} />
  </Frame>
}

function Label({ x, y, w, children, size = 10, align = 'center', color = C.muted, weight = 400 }) {
  return <Text name="Подпись" x={x} y={y} w={w} size={size} weight={weight} font="Inter" color={color} textAlign={align} textAutoResize="height" lineHeight={size * 1.3}>{children}</Text>
}

function Tags({ x, y, items }) {
  return <Frame name="Характеристики" x={x} y={y} w={420} h={20} flex="row" gap={24} items="center">
    {items.map((item) => <Text name={item} font="Inter" size={11} color={C.muted}>{item}</Text>)}
  </Frame>
}

function Grid({ x, y, w, h, step = 16 }) {
  return <Frame name="Модульная сетка" x={x} y={y} w={w} h={h} bg="#FFFFFF55">
    {Array.from({ length: Math.floor(w / step) + 1 }, (_, i) => <Rectangle name="Вертикаль" x={i * step} y={0} w={1} h={h} bg={C.line} />)}
    {Array.from({ length: Math.floor(h / step) + 1 }, (_, i) => <Rectangle name="Горизонталь" x={0} y={i * step} w={w} h={1} bg={C.line} />)}
  </Frame>
}

function Wire1({ x, y, s = 1 }) {
  return <Frame name="Контур знака 1" x={x} y={y} w={160 * s} h={150 * s}>
    <Rectangle name="Холст / контур" x={8 * s} y={10 * s} w={100 * s} h={100 * s} rotate={-12} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
    <Rectangle name="Нижняя панель / контур" x={0} y={116 * s} w={90 * s} h={25 * s} rotate={-12} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
    <Rectangle name="Боковая панель / контур" x={112 * s} y={0} w={42 * s} h={126 * s} rotate={12} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
  </Frame>
}

function Wire3({ x, y, s = 1 }) {
  return <Frame name="Контур знака 3" x={x} y={y} w={160 * s} h={170 * s}>
    <Rectangle name="Кадр / контур" x={8 * s} y={50 * s} w={84 * s} h={84 * s} rotate={27} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
    <Rectangle name="Красный акцент / контур" x={62 * s} y={0} w={40 * s} h={126 * s} rotate={-42} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
    <Rectangle name="Синий акцент / контур" x={88 * s} y={118 * s} w={34 * s} h={58 * s} rotate={42} bg="#00000000" stroke={C.neutral} strokeWidth={1} />
  </Frame>
}

function Swatch({ x, color, hex, name, border = false }) {
  return <Frame name={name} x={x} y={32} w={80} h={93}>
    <Rectangle name="Образец цвета" w={80} h={62} rounded={10} bg={color} stroke={border ? C.line : '#00000000'} strokeWidth={border ? 1 : 0} />
    <Label x={0} y={68} w={80} size={9} align="left" color={C.ink}>{hex}</Label>
    <Label x={0} y={81} w={80} size={8} align="left">{name}</Label>
  </Frame>
}

return <>
  <Rectangle name="Разделитель / концепты" x={0} y={334} w={1448} h={1} bg={C.line} />
  <Rectangle name="Разделитель / версии" x={0} y={503} w={1448} h={1} bg={C.line} />
  <Rectangle name="Разделитель / иконки" x={0} y={667} w={1448} h={1} bg={C.line} />
  <Rectangle name="Разделитель / масштаб" x={0} y={802} w={1448} h={1} bg={C.line} />
  <Rectangle name="Разделитель / система" x={0} y={945} w={1448} h={1} bg={C.line} />
  <Rectangle name="Вертикаль / 1—2" x={488} y={0} w={1} h={945} bg={C.line} />
  <Rectangle name="Вертикаль / 2—3" x={968} y={0} w={1} h={945} bg={C.line} />
  <Rectangle name="Вертикаль / цвет—типографика" x={600} y={945} w={1} h={141} bg={C.line} />
  <Rectangle name="Вертикаль / типографика—анимация" x={1000} y={945} w={1} h={141} bg={C.line} />

  <Frame name="01 / Концепт 1. Интерфейсная композиция" x={0} y={0} w={488} h={334}>
    <Label x={28} y={12} w={440} size={17} align="left" color={C.ink} weight={700}>Концепт 1. Интерфейсная композиция</Label>
    <Text name="Описание концепта" x={28} y={43} w={420} font="Inter" size={12} lineHeight={17} color="#4B4A46" textAutoResize="height">Абстрактная композиция, в которой читается структура{`\n`}редактора: холст, боковая панель и нижняя панель.{`\n`}Лаконичный, сильный, универсальный знак.</Text>
    <Mark1 x={40} y={118} />
    <Word x={223} y={169} />
    <Tags x={40} y={290} items={['Баланс', 'Структура', 'Универсальность', 'Фокус на продукте']} />
  </Frame>

  <Frame name="02 / Концепт 2. Кадр и слои" x={489} y={0} w={479} h={334}>
    <Label x={31} y={12} w={430} size={17} align="left" color={C.ink} weight={700}>Концепт 2. Кадр и слои</Label>
    <Text name="Описание концепта" x={31} y={43} w={410} font="Inter" size={12} lineHeight={17} color="#4B4A46" textAutoResize="height">Знак вдохновлён идеей окна/артборда и слоёв.{`\n`}Более спокойная, строгая композиция. Хорошо работает{`\n`}в интерфейсах и мелких размерах.</Text>
    <Mark2 x={51} y={134} />
    <Word x={206} y={169} />
    <Tags x={40} y={290} items={['Читаемость', 'Современность', 'Модульность', 'Надёжность']} />
  </Frame>

  <Frame name="03 / Концепт 3. Динамическая форма" x={969} y={0} w={479} h={334}>
    <Label x={31} y={12} w={430} size={17} align="left" color={C.ink} weight={700}>Концепт 3. Динамическая форма</Label>
    <Text name="Описание концепта" x={31} y={43} w={430} font="Inter" size={12} lineHeight={17} color="#4B4A46" textAutoResize="height">Более свободная, оживлённая композиция. Передаёт идею{`\n`}творческого процесса и работы ИИ-агентов. Выглядит характерно{`\n`}и эмоционально.</Text>
    <Mark3 x={39} y={108} />
    <Word x={226} y={169} />
    <Tags x={48} y={290} items={['Динамика', 'Творчество', 'Характер', 'Уникальность']} />
  </Frame>

  <Label x={22} y={341} w={300} size={14} align="left" color={C.ink} weight={700}>Основные версии логотипа</Label>
  <Frame name="Версии / Концепт 1" x={0} y={334} w={488} h={169}>
    <Mark1 x={40} y={52} s={0.34} />
    <Word x={99} y={70} size={24} />
    <Mark1 x={258} y={31} s={0.36} />
    <Word x={238} y={98} size={24} />
    <Mark1 x={404} y={50} s={0.34} />
    <Label x={22} y={133} w={174}>Горизонтальная версия</Label>
    <Label x={218} y={133} w={160}>Вертикальная версия</Label>
    <Label x={386} y={133} w={92}>Только знак</Label>
  </Frame>
  <Frame name="Версии / Концепт 2" x={489} y={334} w={479} h={169}>
    <Mark2 x={31} y={66} s={0.35} />
    <Word x={88} y={70} size={24} />
    <Mark2 x={257} y={33} s={0.36} />
    <Word x={238} y={98} size={24} />
    <Mark2 x={394} y={66} s={0.36} />
    <Label x={13} y={133} w={174}>Горизонтальная версия</Label>
    <Label x={207} y={133} w={160}>Вертикальная версия</Label>
    <Label x={377} y={133} w={92}>Только знак</Label>
  </Frame>
  <Frame name="Версии / Концепт 3" x={969} y={334} w={479} h={169}>
    <Mark3 x={35} y={50} s={0.33} />
    <Word x={98} y={70} size={24} />
    <Mark3 x={251} y={31} s={0.36} />
    <Word x={236} y={98} size={24} />
    <Mark3 x={385} y={50} s={0.33} />
    <Label x={19} y={133} w={174}>Горизонтальная версия</Label>
    <Label x={211} y={133} w={160}>Вертикальная версия</Label>
    <Label x={375} y={133} w={92}>Только знак</Label>
  </Frame>

  <Label x={22} y={511} w={250} size={14} align="left" color={C.ink} weight={700}>Иконка приложения</Label>
  <Frame name="Иконки / Концепт 1" x={0} y={503} w={488} h={164}>
    <Frame name="Светлая иконка" x={110} y={25} w={86} h={105} rounded={20} bg={C.white} shadow="0 5 14 #16161612">
      <Mark1 x={12} y={15} s={0.38} />
    </Frame>
    <Frame name="Тёмная иконка" x={266} y={25} w={112} h={105} rounded={26} bg={C.ink}>
      <Mark1 x={18} y={15} s={0.43} inverse={true} />
    </Frame>
    <Label x={91} y={137} w={124}>Светлая тема</Label>
    <Label x={260} y={137} w={124}>Тёмная тема</Label>
  </Frame>
  <Frame name="Иконки / Концепт 2" x={489} y={503} w={479} h={164}>
    <Frame name="Светлая иконка" x={109} y={25} w={92} h={105} rounded={20} bg={C.white} shadow="0 5 14 #16161612">
      <Mark2 x={14} y={21} s={0.52} />
    </Frame>
    <Frame name="Тёмная иконка" x={255} y={25} w={112} h={105} rounded={26} bg={C.ink}>
      <Mark2 x={23} y={21} s={0.54} inverse={true} />
    </Frame>
    <Label x={93} y={137} w={124}>Светлая тема</Label>
    <Label x={249} y={137} w={124}>Тёмная тема</Label>
  </Frame>
  <Frame name="Иконки / Концепт 3" x={969} y={503} w={479} h={164}>
    <Frame name="Светлая иконка" x={109} y={25} w={108} h={105} rounded={22} bg={C.white} shadow="0 5 14 #16161612">
      <Mark3 x={16} y={9} s={0.43} />
    </Frame>
    <Frame name="Тёмная иконка" x={267} y={25} w={112} h={105} rounded={26} bg={C.ink}>
      <Mark3 x={14} y={9} s={0.43} inverse={true} />
    </Frame>
    <Label x={101} y={137} w={124}>Светлая тема</Label>
    <Label x={261} y={137} w={124}>Тёмная тема</Label>
  </Frame>

  <Label x={22} y={675} w={330} size={14} align="left" color={C.ink} weight={700}>Масштабирование и читаемость</Label>
  <Frame name="Масштаб / Концепт 1" x={0} y={667} w={488} h={135}>
    <Frame name="Плитка 64" x={82} y={30} w={84} h={70} rounded={16} bg={C.white} shadow="0 4 12 #16161610">
      <Mark1 x={17} y={8} s={0.32} />
    </Frame>
    <Mark1 x={214} y={52} s={0.19} />
    <Mark1 x={310} y={57} s={0.15} />
    <Mark1 x={390} y={62} s={0.11} />
    <Label x={76} y={107} w={96}>64×64</Label>
    <Label x={198} y={107} w={64}>32×32</Label>
    <Label x={294} y={107} w={64}>24×24</Label>
    <Label x={374} y={107} w={64}>16×16</Label>
  </Frame>
  <Frame name="Масштаб / Концепт 2" x={489} y={667} w={479} h={135}>
    <Mark2 x={85} y={37} s={0.52} />
    <Mark2 x={211} y={57} s={0.24} />
    <Mark2 x={303} y={60} s={0.20} />
    <Mark2 x={383} y={64} s={0.14} />
    <Label x={73} y={107} w={96}>64×64</Label>
    <Label x={195} y={107} w={64}>32×32</Label>
    <Label x={287} y={107} w={64}>24×24</Label>
    <Label x={367} y={107} w={64}>16×16</Label>
  </Frame>
  <Frame name="Масштаб / Концепт 3" x={969} y={667} w={479} h={135}>
    <Mark3 x={73} y={25} s={0.52} />
    <Mark3 x={215} y={43} s={0.32} />
    <Mark3 x={315} y={53} s={0.23} />
    <Mark3 x={391} y={62} s={0.16} />
    <Label x={57} y={107} w={96}>64×64</Label>
    <Label x={199} y={107} w={64}>32×32</Label>
    <Label x={299} y={107} w={64}>24×24</Label>
    <Label x={375} y={107} w={64}>16×16</Label>
  </Frame>

  <Label x={22} y={809} w={260} size={14} align="left" color={C.ink} weight={700}>Построение и сетка</Label>
  <Frame name="Построение / Концепт 1" x={0} y={802} w={488} h={143}>
    <Grid x={40} y={22} w={134} h={92} step={16} />
    <Mark1 x={63} y={31} s={0.50} />
    <Wire1 x={204} y={26} s={0.62} />
    <Wire1 x={348} y={38} s={0.45} />
    <Rectangle name="Угол 12°" x={289} y={35} w={1} h={74} rotate={12} bg={C.neutral} />
    <Rectangle name="Модульная ось" x={355} y={94} w={100} h={1} rotate={-12} bg={C.neutral} />
    <Label x={34} y={120} w={146}>Сетка 16×16</Label>
    <Label x={198} y={120} w={120}>Углы поворота</Label>
    <Label x={332} y={120} w={146}>Модульные пропорции</Label>
  </Frame>
  <Frame name="Построение / Концепт 2" x={489} y={802} w={479} h={143}>
    <Grid x={31} y={22} w={118} h={92} step={16} />
    <Mark2 x={51} y={38} s={0.58} />
    <Grid x={187} y={30} w={98} h={82} step={16} />
    <Rectangle name="Модуль / вертикаль" x={239} y={30} w={1} h={82} bg={C.neutral} />
    <Rectangle name="Модуль / горизонталь" x={187} y={84} w={98} h={1} bg={C.neutral} />
    <Grid x={343} y={30} w={84} h={82} step={21} />
    <Rectangle name="Пропорция / вертикаль" x={392} y={30} w={1} h={82} bg={C.neutral} />
    <Rectangle name="Пропорция / горизонталь" x={343} y={83} w={84} h={1} bg={C.neutral} />
    <Label x={17} y={120} w={146}>Сетка 16×16</Label>
    <Label x={171} y={120} w={132}>Модульная система</Label>
    <Label x={329} y={120} w={112}>Пропорции</Label>
  </Frame>
  <Frame name="Построение / Концепт 3" x={969} y={802} w={479} h={143}>
    <Grid x={39} y={22} w={120} h={92} step={16} />
    <Mark3 x={50} y={22} s={0.48} />
    <Wire3 x={193} y={20} s={0.60} />
    <Wire3 x={327} y={22} s={0.55} />
    <Wire3 x={362} y={30} s={0.42} />
    <Label x={26} y={120} w={146}>Сетка 16×16</Label>
    <Label x={181} y={120} w={132}>Композиция</Label>
    <Label x={325} y={120} w={132}>Вариативность</Label>
  </Frame>

  <Frame name="Цветовая система" x={0} y={945} w={600} h={141}>
    <Label x={32} y={7} w={240} size={14} align="left" color={C.ink} weight={700}>Цветовая система</Label>
    <Swatch x={32} color={C.ink} hex="#161616" name="Основной" />
    <Swatch x={120} color={C.red} hex="#D94A38" name="Акцентный" />
    <Swatch x={208} color={C.blue} hex="#2D63A8" name="Вторичный" />
    <Swatch x={296} color={C.yellow} hex="#E5B636" name="Дополнительный" />
    <Swatch x={384} color={C.paper} hex="#F5F1EB" name="Фон" border={true} />
    <Swatch x={472} color={C.neutral} hex="#C9C5BB" name="Нейтральный" />
  </Frame>

  <Frame name="Типографика" x={601} y={945} w={399} h={141}>
    <Label x={33} y={7} w={200} size={14} align="left" color={C.ink} weight={700}>Типографика</Label>
    <Word x={33} y={27} size={34} name="Пример словесного знака" />
    <Text name="Описание шрифта" x={33} y={65} w={340} font="Inter" size={9} lineHeight={12} color={C.muted} textAutoResize="height">Современный гротеск с хорошей кириллицей.{`\n`}Спокойный, уверенный, технологичный.</Text>
    <Text name="Набор символов" x={33} y={91} w={350} font="Inter" size={9} weight={600} lineHeight={12} color={C.ink} textAutoResize="height">АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ{`\n`}абвгдеёжзийклмнопрстуфхцчшщъыьэюя{`\n`}0123456789  …,:!?()[]{} — /\@#%&*+-=</Text>
  </Frame>

  <Frame name="Анимация появления знака" x={1001} y={945} w={447} h={141}>
    <Label x={23} y={7} w={280} size={14} align="left" color={C.ink} weight={700}>Анимация появления знака</Label>
    <Rectangle name="Шаг 1 / элемент" x={53} y={59} w={10} h={10} bg={C.ink} />
    <Text name="Стрелка 1" x={111} y={53} font="Inter" size={18} color={C.muted}>→</Text>
    <Mark1 x={143} y={43} s={0.16} />
    <Text name="Стрелка 2" x={211} y={53} font="Inter" size={18} color={C.muted}>→</Text>
    <Mark1 x={242} y={36} s={0.27} />
    <Text name="Стрелка 3" x={315} y={53} font="Inter" size={18} color={C.muted}>→</Text>
    <Mark1 x={347} y={30} s={0.34} />
    <Label x={24} y={103} w={74} size={8}>1. Появление элементов</Label>
    <Label x={132} y={103} w={74} size={8}>2. Движение</Label>
    <Label x={232} y={103} w={82} size={8}>3. Сборка композиции</Label>
    <Label x={337} y={103} w={84} size={8}>4. Финальный знак</Label>
  </Frame>
</>
})()}
</Frame>
