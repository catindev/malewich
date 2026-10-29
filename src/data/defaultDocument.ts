import type { DesignDocument, EditorNode } from '../types';

const now = () => new Date().toISOString();

export function createEmptyDocument(name = 'Без названия'): DesignDocument {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    createdAt: now(),
    updatedAt: now(),
    nodes: [],
    pages: [{ id: 'page-1', name: 'Страница 1' }],
    activePageId: 'page-1',
  };
}

export function createWelcomeDocument(): DesignDocument {
  const doc = createEmptyDocument('Мой первый проект');
  const nodes: EditorNode[] = [
    {
      id: 'welcome-frame', type: 'frame', name: 'Добро пожаловать', x: 0, y: 0,
      width: 920, height: 600, rotation: 0, opacity: 1, visible: true, locked: false,
      parentId: null, pageId: 'page-1', fill: '#f6f4ee', stroke: 'transparent', strokeWidth: 0,
      cornerRadius: 0, clip: true,
    },
    {
      id: 'welcome-kicker', type: 'text', name: 'Подзаголовок', x: 88, y: 86,
      width: 360, height: 28, rotation: 0, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#746d61', stroke: 'transparent', strokeWidth: 0,
      text: 'MALEWICH / ВАШ НОВЫЙ ХОЛСТ', fontSize: 16, fontFamily: 'Inter, Arial, sans-serif',
      fontWeight: 600, lineHeight: 1.2, letterSpacing: 2, textAlign: 'left',
    },
    {
      id: 'welcome-title', type: 'text', name: 'Заголовок', x: 82, y: 145,
      width: 650, height: 174, rotation: 0, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#25231f', stroke: 'transparent', strokeWidth: 0,
      text: 'Идеи начинаются\nс чистого холста.', fontSize: 62,
      fontFamily: 'Inter, Arial, sans-serif', fontWeight: 600, lineHeight: 1.12,
      letterSpacing: -2.5, textAlign: 'left',
    },
    {
      id: 'welcome-copy', type: 'text', name: 'Описание', x: 88, y: 355,
      width: 470, height: 66, rotation: 0, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#746d61', stroke: 'transparent', strokeWidth: 0,
      text: 'Выберите инструмент слева и создайте что-нибудь.\nДвойной клик по тексту — чтобы изменить его.',
      fontSize: 18, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 400,
      lineHeight: 1.55, letterSpacing: 0, textAlign: 'left',
    },
    {
      id: 'welcome-shape', type: 'ellipse', name: 'Акцент', x: 698, y: 82,
      width: 128, height: 128, rotation: 0, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#d9ff63', stroke: 'transparent', strokeWidth: 0,
    },
    {
      id: 'welcome-card', type: 'rectangle', name: 'Карточка', x: 626, y: 338,
      width: 208, height: 170, rotation: -7, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#8b5cf6', stroke: 'transparent', strokeWidth: 0,
      cornerRadius: 24,
    },
    {
      id: 'welcome-card-text', type: 'text', name: 'Знак карточки', x: 658, y: 372,
      width: 150, height: 92, rotation: -7, opacity: 1, visible: true, locked: false,
      parentId: 'welcome-frame', fill: '#ffffff', stroke: 'transparent', strokeWidth: 0,
      text: '↗', fontSize: 76, fontFamily: 'Inter, Arial, sans-serif', fontWeight: 400,
      lineHeight: 1.1, letterSpacing: 0, textAlign: 'center',
    },
  ];
  return { ...doc, nodes };
}
