import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowRight,
  Code2,
  Component,
  Copy,
  Diamond,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Minus,
  MousePointer2,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { AutoLayoutSettings, EditorNode, TextAlign, TextNode } from '../types';
import { createAutoLayout } from '../utils/autoLayout';
import { getNode } from '../utils/document';
import { measureAutoText } from '../utils/text';
import { DevPanel } from './DevPanel';
import { usePageDocument } from '../hooks/usePageDocument';

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function NumberField({ label, value, onCommit, min = -100000, max = 100000, step = 1, suffix }: NumberFieldProps) {
  const format = (number: number) => String(Math.round(number * 100) / 100);
  const [draft, setDraft] = useState(format(value));
  useEffect(() => setDraft(format(value)), [value]);

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) onCommit(Math.min(max, Math.max(min, parsed)));
    else setDraft(format(value));
  };

  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        value={draft} inputMode="decimal"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const direction = event.key === 'ArrowUp' ? 1 : -1;
            const amount = step * (event.shiftKey ? 10 : 1);
            const next = Math.min(max, Math.max(min, value + direction * amount));
            onCommit(next);
            setDraft(format(next));
          }
        }}
      />
      {suffix && <em>{suffix}</em>}
    </label>
  );
}

function TextField({ value, onCommit, className = '', ariaLabel }: { value: string; onCommit: (value: string) => void; className?: string; ariaLabel: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className={`text-field ${className}`} value={draft} aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    />
  );
}

function ColorField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <label className="color-field">
      <span className="property-label">{label}</span>
      <div>
        <input type="color" value={color} onChange={(event) => onCommit(event.target.value)} aria-label={`${label}: выбрать цвет`} />
        <input
          className="color-value" value={draft} aria-label={`${label}: HEX`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (/^#[0-9a-f]{6}$/i.test(draft) || draft === 'transparent') onCommit(draft);
            else setDraft(value);
          }}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        />
      </div>
    </label>
  );
}

function PropertySection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="property-section">
      <div className="property-section-heading"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

function TextContentField({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <textarea
      className="text-content-field" value={draft} rows={4}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

export function Inspector() {
  const doc = usePageDocument();
  const selection = useEditorStore((state) => state.selection);
  const updateNode = useEditorStore((state) => state.updateNode);
  const updateSelection = useEditorStore((state) => state.updateSelection);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection);
  const alignSelection = useEditorStore((state) => state.alignSelection);
  const createComponent = useEditorStore((state) => state.createComponent);
  const createInstance = useEditorStore((state) => state.createInstance);
  const createVariant = useEditorStore((state) => state.createVariant);
  const setVariant = useEditorStore((state) => state.setVariant);
  const resetInstance = useEditorStore((state) => state.resetInstance);
  const detachInstance = useEditorStore((state) => state.detachInstance);
  const addPrototypeLink = useEditorStore((state) => state.addPrototypeLink);
  const removePrototypeLink = useEditorStore((state) => state.removePrototypeLink);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [devMode, setDevMode] = useState(false);
  const selectedNodes = selection.flatMap((id) => {
    const node = getNode(doc, id);
    return node ? [node] : [];
  });
  const node = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  const parentNode = node?.parentId ? getNode(doc, node.parentId) : undefined;
  const updateTextProperties = (patch: Partial<TextNode>) => {
    if (!node || node.type !== 'text') return;
    const nextNode = { ...node, ...patch };
    updateNode(node.id, { ...patch, ...measureAutoText(nextNode) });
  };

  const replaceImage = (file: File | undefined) => {
    if (!file || !node || node.type !== 'image') return;
    const reader = new FileReader();
    reader.onload = () => updateNode(node.id, { src: String(reader.result), name: file.name.replace(/\.[^.]+$/, '') });
    reader.readAsDataURL(file);
  };

  return (
    <aside className="inspector panel">
      <header className="panel-header">
        <div><SlidersHorizontal size={15} /><span>{devMode ? 'Dev Mode' : 'Инспектор'}</span></div>
        <div className="panel-header-actions">
          <button className={devMode ? 'is-active' : ''} title="Dev Mode" aria-pressed={devMode} onClick={() => setDevMode(!devMode)}><Code2 size={14} /></button>
        </div>
        {node && (
          <div className="panel-header-actions">
            <button title={node.locked ? 'Разблокировать' : 'Заблокировать'} onClick={() => updateNode(node.id, { locked: !node.locked })}>
              {node.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button title={node.visible ? 'Скрыть' : 'Показать'} onClick={() => updateNode(node.id, { visible: !node.visible })}>
              {node.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        )}
      </header>
      <div className="inspector-scroll">
        {devMode ? <DevPanel doc={doc} nodes={selectedNodes} /> : <>
        {!node && selectedNodes.length === 0 && (
          <div className="inspector-empty">
            <div className="inspector-empty-icon"><MousePointer2 size={23} /></div>
            <h2>Ничего не выбрано</h2>
            <p>Выберите объект на холсте или в панели слоёв, чтобы изменить его свойства.</p>
            <div className="inspector-tips">
              <div><span>Создать фрейм</span><kbd>F</kbd></div>
              <div><span>Добавить текст</span><kbd>T</kbd></div>
              <div><span>Дублировать</span><kbd>⌘ D</kbd></div>
            </div>
            <div className="document-meta">
              <span>Проект</span>
              <strong>{doc.name}</strong>
              <small>{doc.nodes.length} объектов · версия 1</small>
            </div>
          </div>
        )}
        {!node && selectedNodes.length > 1 && (
          <>
            <div className="multi-selection-heading">
              <div className="inspector-empty-icon"><Copy size={20} /></div>
              <h2>Выбрано объектов: {selectedNodes.length}</h2>
              <p>Можно трансформировать, выровнять, дублировать или удалить их вместе.</p>
            </div>
            <PropertySection title="Выравнивание">
              <div className="alignment-tools">
                <button title="По левому краю" onClick={() => alignSelection('left')}><AlignHorizontalJustifyStart size={16} /></button>
                <button title="По центру по горизонтали" onClick={() => alignSelection('horizontal-center')}><AlignHorizontalJustifyCenter size={16} /></button>
                <button title="По правому краю" onClick={() => alignSelection('right')}><AlignHorizontalJustifyEnd size={16} /></button>
                <button title="По верхнему краю" onClick={() => alignSelection('top')}><AlignVerticalJustifyStart size={16} /></button>
                <button title="По центру по вертикали" onClick={() => alignSelection('vertical-center')}><AlignVerticalJustifyCenter size={16} /></button>
                <button title="По нижнему краю" onClick={() => alignSelection('bottom')}><AlignVerticalJustifyEnd size={16} /></button>
              </div>
              <div className="distribute-tools">
                <button disabled={selectedNodes.length < 3} title="Распределить по горизонтали" onClick={() => alignSelection('distribute-horizontal')}><AlignHorizontalDistributeCenter size={16} /> Горизонтально</button>
                <button disabled={selectedNodes.length < 3} title="Распределить по вертикали" onClick={() => alignSelection('distribute-vertical')}><AlignVerticalDistributeCenter size={16} /> Вертикально</button>
              </div>
            </PropertySection>
            <PropertySection title="Внешний вид">
              <NumberField label="Непрозрачность" value={100} min={0} max={100} suffix="%" onCommit={(value) => updateSelection({ opacity: value / 100 })} />
            </PropertySection>
          </>
        )}
        {node && (
          <>
            <div className="selected-node-heading">
              <div className="node-type-badges">
                {node.component ? (
                  <span className={`node-type-pill is-${node.component.role}`}>
                    {node.component.role === 'main' ? <Component size={11} /> : <Diamond size={10} />}
                    {node.component.role === 'main' ? 'Main component' : 'Instance'}
                  </span>
                ) : node.type === 'frame' && node.autoLayout ? null : (
                  <span className={`node-type-pill is-${node.type}`}>
                    {node.type === 'rectangle' || node.type === 'ellipse' ? 'Фигура' : node.type === 'frame' && !node.autoLayout ? 'Фрейм' : node.type === 'text' ? 'Текст' : node.type === 'vector' ? 'Вектор' : node.type === 'image' ? 'Изображение' : ''}
                  </span>
                )}
                {node.type === 'frame' && node.autoLayout && (
                  <span className="node-type-pill is-auto-layout">
                    {node.autoLayout.direction === 'horizontal' ? <ArrowRight size={11} /> : <ArrowDown size={11} />}
                    Auto Layout · {node.autoLayout.direction === 'horizontal' ? 'горизонтальный' : 'вертикальный'}
                  </span>
                )}
              </div>
              <TextField value={node.name} ariaLabel="Название слоя" onCommit={(name) => updateNode(node.id, { name: name.trim() || node.name })} />
            </div>
            <PropertySection title="Макет">
              <div className="property-grid">
                <NumberField label="X" value={node.x} onCommit={(x) => updateNode(node.id, { x })} />
                <NumberField label="Y" value={node.y} onCommit={(y) => updateNode(node.id, { y })} />
                <NumberField label="W" value={node.width} min={1} onCommit={(width) => updateNode(node.id, { width, ...(node.type === 'text' ? { autoSize: 'none' as const } : {}) })} />
                <NumberField label="H" value={node.height} min={1} onCommit={(height) => updateNode(node.id, { height, ...(node.type === 'text' ? { autoSize: 'none' as const } : {}) })} />
              </div>
              <NumberField label="Угол" value={node.rotation} min={-360} max={360} step={1} suffix="°" onCommit={(rotation) => updateNode(node.id, { rotation })} />
            </PropertySection>
            {parentNode?.type === 'frame' && parentNode.autoLayout && (() => {
              const childLayout = node.layout ?? { horizontal: 'fixed' as const, vertical: 'fixed' as const, absolute: false };
              const patchChildLayout = (patch: Partial<NonNullable<EditorNode['layout']>>) => updateNode(node.id, { layout: { ...childLayout, ...patch } });
              return (
                <PropertySection title="Вложенный layout">
                  <div className="property-grid">
                    <select className="font-select" aria-label="Горизонталь ребёнка" value={childLayout.horizontal} onChange={(event) => patchChildLayout({ horizontal: event.target.value as 'fixed' | 'fill' })}>
                      <option value="fixed">Horizontal: Fixed</option>
                      <option value="fill">Horizontal: Fill</option>
                    </select>
                    <select className="font-select" aria-label="Вертикаль ребёнка" value={childLayout.vertical} onChange={(event) => patchChildLayout({ vertical: event.target.value as 'fixed' | 'fill' })}>
                      <option value="fixed">Vertical: Fixed</option>
                      <option value="fill">Vertical: Fill</option>
                    </select>
                    <NumberField label="MinW" value={childLayout.minWidth ?? 1} min={1} onCommit={(minWidth) => patchChildLayout({ minWidth })} />
                    <NumberField label="MaxW" value={childLayout.maxWidth ?? 10000} min={1} onCommit={(maxWidth) => patchChildLayout({ maxWidth: maxWidth >= 10000 ? undefined : maxWidth })} />
                    <NumberField label="MinH" value={childLayout.minHeight ?? 1} min={1} onCommit={(minHeight) => patchChildLayout({ minHeight })} />
                    <NumberField label="MaxH" value={childLayout.maxHeight ?? 10000} min={1} onCommit={(maxHeight) => patchChildLayout({ maxHeight: maxHeight >= 10000 ? undefined : maxHeight })} />
                  </div>
                  <label className="checkbox-property">
                    <input type="checkbox" aria-label="Absolute position" checked={childLayout.absolute} onChange={(event) => patchChildLayout({ absolute: event.target.checked })} />
                    <span>Absolute position</span>
                  </label>
                </PropertySection>
              );
            })()}
            <PropertySection title="Компонент">
              {!node.component && (
                <button className="replace-image-button" onClick={() => createComponent(node.id)}>◇ Создать компонент</button>
              )}
              {node.component?.role === 'main' && (
                <>
                  <div className="component-status">◇ Main component</div>
                  <button className="replace-image-button" onClick={() => createInstance(node.id)}>＋ Создать instance</button>
                  <button className="replace-image-button" onClick={() => createVariant(node.component!.rootId)}>＋ Добавить вариант</button>
                </>
              )}
              {node.component?.role === 'instance' && (
                <>
                  {node.variantSetId && (() => {
                    const variants = doc.nodes.filter((candidate) => candidate.variantSetId === node.variantSetId && candidate.component?.role === 'main' && candidate.id === candidate.component.rootId);
                    const instanceRoot = doc.nodes.find((candidate) => candidate.component?.role === 'instance' && candidate.component.rootId === node.component!.rootId && candidate.component.sourceId === candidate.component.rootId);
                    return (
                      <select
                        className="font-select" aria-label="Вариант компонента" value={node.component!.rootId}
                        onChange={(event) => instanceRoot && setVariant(instanceRoot.id, event.target.value)}
                      >
                        {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.variantProps?.State ?? variant.name}</option>)}
                      </select>
                    );
                  })()}
                  <div className="component-status">◆ Instance · overrides: {Object.keys(node.overrides ?? {}).length}</div>
                  <button className="replace-image-button" onClick={() => resetInstance(node.id)}>Сбросить overrides</button>
                  <button className="replace-image-button" onClick={() => detachInstance(node.id)}>Отсоединить instance</button>
                </>
              )}
            </PropertySection>
            {node.type === 'frame' && (
              <PropertySection title="Прототип">
                {(() => {
                  const link = (doc.prototypeLinks ?? []).find((item) => item.sourceFrameId === node.id);
                  const targets = doc.nodes.filter((candidate) => candidate.type === 'frame' && candidate.parentId === null && candidate.id !== node.id);
                  return (
                    <>
                      <select
                        className="font-select" aria-label="Цель перехода" value={link?.targetFrameId ?? ''}
                        onChange={(event) => {
                          if (event.target.value) addPrototypeLink(node.id, event.target.value, link?.transition, link?.duration);
                          else if (link) removePrototypeLink(link.id);
                        }}
                      >
                        <option value="">Нет перехода</option>
                        {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
                      </select>
                      {link && (
                        <>
                          <select className="font-select" aria-label="Тип перехода" value={link.transition} onChange={(event) => addPrototypeLink(node.id, link.targetFrameId, event.target.value as 'instant' | 'dissolve' | 'slide', link.duration)}>
                            <option value="instant">Instant</option>
                            <option value="dissolve">Dissolve</option>
                            <option value="slide">Slide</option>
                          </select>
                          <NumberField label="Длительность" value={link.duration} min={0} max={3000} step={50} suffix="ms" onCommit={(duration) => addPrototypeLink(node.id, link.targetFrameId, link.transition, duration)} />
                        </>
                      )}
                    </>
                  );
                })()}
              </PropertySection>
            )}
            {node.type === 'frame' && (
              <PropertySection
                title="Auto Layout"
                action={<button
                  className="property-section-action"
                  title={node.autoLayout ? 'Удалить Auto Layout' : 'Добавить Auto Layout'}
                  aria-label={node.autoLayout ? 'Удалить Auto Layout' : 'Добавить Auto Layout'}
                  onClick={() => updateNode(node.id, { autoLayout: node.autoLayout ? undefined : createAutoLayout() })}
                >{node.autoLayout ? <Minus size={14} /> : <Plus size={14} />}</button>}
              >
                {!node.autoLayout && <p className="property-hint">Добавьте Auto Layout, чтобы располагать дочерние слои по правилам.</p>}
                {node.autoLayout && (() => {
                  const layout = node.autoLayout!;
                  const patchLayout = (patch: Partial<AutoLayoutSettings>) => updateNode(node.id, { autoLayout: { ...layout, ...patch } });
                  const patchPadding = (side: keyof AutoLayoutSettings['padding'], value: number) => patchLayout({ padding: { ...layout.padding, [side]: value } });
                  return (
                    <div className="auto-layout-controls">
                      <select className="font-select" aria-label="Направление layout" value={layout.direction} onChange={(event) => patchLayout({ direction: event.target.value as AutoLayoutSettings['direction'] })}>
                        <option value="horizontal">Горизонтально →</option>
                        <option value="vertical">Вертикально ↓</option>
                      </select>
                      <NumberField label="Gap" value={layout.gap} min={0} max={500} onCommit={(gap) => patchLayout({ gap })} />
                      <div className="property-grid">
                        <NumberField label="Top" value={layout.padding.top} min={0} onCommit={(value) => patchPadding('top', value)} />
                        <NumberField label="Right" value={layout.padding.right} min={0} onCommit={(value) => patchPadding('right', value)} />
                        <NumberField label="Bottom" value={layout.padding.bottom} min={0} onCommit={(value) => patchPadding('bottom', value)} />
                        <NumberField label="Left" value={layout.padding.left} min={0} onCommit={(value) => patchPadding('left', value)} />
                      </div>
                      <select className="font-select" aria-label="Выравнивание layout" value={layout.align} onChange={(event) => patchLayout({ align: event.target.value as AutoLayoutSettings['align'] })}>
                        <option value="start">По началу</option>
                        <option value="center">По центру</option>
                        <option value="end">По концу</option>
                      </select>
                      <select className="font-select" aria-label="Распределение layout" value={layout.justify} onChange={(event) => patchLayout({ justify: event.target.value as AutoLayoutSettings['justify'] })}>
                        <option value="start">В начале</option>
                        <option value="center">По центру</option>
                        <option value="end">В конце</option>
                        <option value="space-between">Space between</option>
                      </select>
                      <div className="property-grid">
                        <select className="font-select" aria-label="Ширина layout" value={layout.widthMode ?? (layout.hug && layout.direction === 'horizontal' ? 'hug' : 'fixed')} onChange={(event) => patchLayout({ widthMode: event.target.value as AutoLayoutSettings['widthMode'], hug: false })}>
                          <option value="fixed">Width: Fixed</option>
                          <option value="hug">Width: Hug</option>
                        </select>
                        <select className="font-select" aria-label="Высота layout" value={layout.heightMode ?? (layout.hug && layout.direction === 'vertical' ? 'hug' : 'fixed')} onChange={(event) => patchLayout({ heightMode: event.target.value as AutoLayoutSettings['heightMode'], hug: false })}>
                          <option value="fixed">Height: Fixed</option>
                          <option value="hug">Height: Hug</option>
                        </select>
                        <NumberField label="MinW" value={layout.minWidth ?? 1} min={1} onCommit={(minWidth) => patchLayout({ minWidth })} />
                        <NumberField label="MaxW" value={layout.maxWidth ?? 10000} min={1} onCommit={(maxWidth) => patchLayout({ maxWidth: maxWidth >= 10000 ? undefined : maxWidth })} />
                        <NumberField label="MinH" value={layout.minHeight ?? 1} min={1} onCommit={(minHeight) => patchLayout({ minHeight })} />
                        <NumberField label="MaxH" value={layout.maxHeight ?? 10000} min={1} onCommit={(maxHeight) => patchLayout({ maxHeight: maxHeight >= 10000 ? undefined : maxHeight })} />
                      </div>
                      <label className="checkbox-property">
                        <input type="checkbox" aria-label="Hug Contents" checked={layout.hug} onChange={(event) => patchLayout({ hug: event.target.checked })} />
                        <span>Hug Contents</span>
                      </label>
                    </div>
                  );
                })()}
              </PropertySection>
            )}
            {'fill' in node && (
              <PropertySection title="Заливка и обводка">
                <ColorField label="Заливка" value={node.fill} onCommit={(fill) => updateNode(node.id, { fill })} />
                <ColorField label="Обводка" value={node.stroke} onCommit={(stroke) => updateNode(node.id, { stroke })} />
                <NumberField label="Толщина" value={node.strokeWidth} min={0} max={100} onCommit={(strokeWidth) => updateNode(node.id, { strokeWidth })} />
              </PropertySection>
            )}
            <PropertySection title="Внешний вид">
              <label className="range-property">
                <span>Непрозрачность</span><span>{Math.round(node.opacity * 100)}%</span>
                <input type="range" min="0" max="1" step="0.01" value={node.opacity} onChange={(event) => updateNode(node.id, { opacity: Number(event.target.value) })} />
              </label>
              {'cornerRadius' in node && (
                <NumberField label="Скругление" value={node.cornerRadius} min={0} max={500} onCommit={(cornerRadius) => updateNode(node.id, { cornerRadius })} />
              )}
              {node.type === 'frame' && (
                <label className="checkbox-property">
                  <input type="checkbox" checked={node.clip} onChange={(event) => updateNode(node.id, { clip: event.target.checked })} />
                  <span>Обрезать содержимое</span>
                </label>
              )}
            </PropertySection>
            {node.type === 'text' && (
              <PropertySection title="Текст">
                <TextContentField value={node.text} onCommit={(text) => updateTextProperties({ text })} />
                <select
                  className="font-select" aria-label="Режим текста" value={node.autoSize ?? 'none'}
                  onChange={(event) => updateTextProperties({ autoSize: event.target.value as TextNode['autoSize'] })}
                >
                  <option value="width">Auto width</option>
                  <option value="height">Auto height</option>
                  <option value="none">Fixed size</option>
                </select>
                <select className="font-select" value={node.fontFamily} onChange={(event) => updateTextProperties({ fontFamily: event.target.value })}>
                  <option value="Inter, Arial, sans-serif">Inter</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Courier New, monospace">Courier New</option>
                  <option value="system-ui, sans-serif">System UI</option>
                </select>
                <div className="property-grid">
                  <NumberField label="Размер" value={node.fontSize} min={1} max={600} onCommit={(fontSize) => updateTextProperties({ fontSize })} />
                  <NumberField label="Насыщенность" value={node.fontWeight} min={100} max={900} step={100} onCommit={(fontWeight) => updateTextProperties({ fontWeight })} />
                  <NumberField label="Строка" value={node.lineHeight} min={0.5} max={4} step={0.05} onCommit={(lineHeight) => updateTextProperties({ lineHeight })} />
                  <NumberField label="Интервал" value={node.letterSpacing} min={-20} max={100} step={0.1} onCommit={(letterSpacing) => updateTextProperties({ letterSpacing })} />
                </div>
                <div className="alignment-control">
                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([align, Icon]) => (
                    <button key={align} className={node.textAlign === align ? 'is-active' : ''} onClick={() => updateNode(node.id, { textAlign: align as TextAlign })}>
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </PropertySection>
            )}
            {node.type === 'image' && (
              <PropertySection title="Изображение">
                <button className="replace-image-button" onClick={() => imageInputRef.current?.click()}><ImageIcon size={15} /> Заменить изображение</button>
                <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(event) => {
                  replaceImage(event.target.files?.[0]);
                  event.target.value = '';
                }} />
              </PropertySection>
            )}
          </>
        )}
        </>}
      </div>
      {selectedNodes.length > 0 && (
        <div className="inspector-actions">
          <button onClick={duplicateSelection}><Copy size={15} /><span>Дублировать</span></button>
          <button className="danger-action" onClick={deleteSelection}><Trash2 size={15} /><span>Удалить</span></button>
        </div>
      )}
      {node && node.rotation !== 0 && (
        <button className="reset-rotation" onClick={() => updateNode(node.id, { rotation: 0 })}><RotateCw size={13} /> Сбросить поворот</button>
      )}
    </aside>
  );
}
