import { useState } from 'react';
import { Braces, Component, Droplet, Plus, Trash2, Type } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { ColorStyleDefinition, TextStyleDefinition } from '../types';

export function LibraryPanel() {
  const doc = useEditorStore((state) => state.doc);
  const selection = useEditorStore((state) => state.selection);
  const createStyle = useEditorStore((state) => state.createStyle);
  const applyStyle = useEditorStore((state) => state.applyStyle);
  const updateStyle = useEditorStore((state) => state.updateStyle);
  const deleteStyle = useEditorStore((state) => state.deleteStyle);
  const createVariable = useEditorStore((state) => state.createVariable);
  const createVariableCollection = useEditorStore((state) => state.createVariableCollection);
  const setVariableMode = useEditorStore((state) => state.setVariableMode);
  const updateVariableValue = useEditorStore((state) => state.updateVariableValue);
  const applyVariable = useEditorStore((state) => state.applyVariable);
  const updateVariable = useEditorStore((state) => state.updateVariable);
  const deleteVariable = useEditorStore((state) => state.deleteVariable);
  const createInstance = useEditorStore((state) => state.createInstance);
  const [colorTarget, setColorTarget] = useState('fill');
  const [numberTarget, setNumberTarget] = useState('auto');
  const [query, setQuery] = useState('');
  const selectedId = selection[0] ?? null;
  const selectedNode = doc.nodes.find((node) => node.id === selectedId);
  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const components = doc.nodes.filter((node) => node.component?.role === 'main' && node.id === node.component.rootId && matches(node.name));
  const colorStyles = (doc.styles ?? []).filter((style): style is ColorStyleDefinition => style.type === 'color' && matches(style.name));
  const textStyles = (doc.styles ?? []).filter((style): style is TextStyleDefinition => style.type === 'text' && matches(style.name));
  const variables = (doc.variables ?? []).filter((variable) => matches(variable.name));
  const collections = doc.variableCollections ?? [];
  const renderVariable = (variable: (typeof variables)[number]) => {
    const collection = collections.find((item) => item.id === variable.collectionId);
    const activeValue = collection && variable.modeValues ? variable.modeValues[collection.activeModeId] ?? variable.value : variable.value;
    return (
      <div className="library-row" key={variable.id}>
        {variable.type === 'color' ? (
          <input className="library-swatch" type="color" aria-label={`Переменная ${variable.name}`} value={String(activeValue)} onChange={(event) => updateVariableValue(variable.id, event.target.value)} />
        ) : (
          <input
            className="library-number" aria-label={`Переменная ${variable.name}`} type="number" defaultValue={Number(activeValue)}
            key={`${variable.id}-${activeValue}`} onBlur={(event) => updateVariableValue(variable.id, Number(event.target.value))}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          />
        )}
        <input className="library-name-input" defaultValue={variable.name} key={`${variable.id}-${variable.name}`} onBlur={(event) => updateVariable(variable.id, { name: event.target.value })} />
        <select
          className="library-alias" aria-label={`Alias ${variable.name}`} value={variable.aliasOf ?? ''}
          onChange={(event) => updateVariable(variable.id, { aliasOf: event.target.value || undefined })}
        >
          <option value="">—</option>
          {variables.filter((candidate) => candidate.id !== variable.id && candidate.type === variable.type).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
          ))}
        </select>
        <button
          className="library-apply" disabled={!selectedNode} title="Применить переменную"
          onClick={() => selectedId && applyVariable(selectedId, variable.id, variable.type === 'color' ? colorTarget : numberTarget === 'auto' ? undefined : numberTarget)}
        >→</button>
        <button className="library-delete" title="Удалить переменную" onClick={() => deleteVariable(variable.id)}><Trash2 size={11} /></button>
      </div>
    );
  };

  return (
    <div className="library-panel">
      <div className="library-search"><input aria-label="Поиск в библиотеке" placeholder="Поиск в библиотеке…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="library-targets">
        <select aria-label="Свойство цвета" value={colorTarget} onChange={(event) => setColorTarget(event.target.value)}>
          <option value="fill">Заливка</option>
          <option value="stroke">Обводка</option>
        </select>
        <select aria-label="Свойство числа" value={numberTarget} onChange={(event) => setNumberTarget(event.target.value)}>
          <option value="auto">Авто-свойство</option>
          <option value="autoLayout.gap">Layout gap</option>
          <option value="autoLayout.padding.top">Padding top</option>
          <option value="cornerRadius">Скругление</option>
          <option value="opacity">Непрозрачность</option>
          <option value="width">Ширина</option>
          <option value="height">Высота</option>
        </select>
      </div>
      <div className="library-scroll">
        <section className="library-section">
          <header><span><Component size={13} /> Компоненты</span></header>
          {components.length === 0 && <p className="library-empty">Создайте компонент через инспектор выделенного объекта.</p>}
          {components.map((component) => (
            <div
              className="library-row library-component" key={component.id} draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/x-malewich-component', component.id);
              }}
            >
              <span className="library-token">◇</span>
              <span className="library-name" title={component.name}>{component.name}</span>
              <button className="library-apply" onClick={() => createInstance(component.id)}>Instance</button>
            </div>
          ))}
        </section>

        <section className="library-section">
          <header>
            <span><Droplet size={13} /> Цветовые стили</span>
            <button title="Создать цветовой стиль" onClick={() => createStyle(selectedId, 'color')}><Plus size={13} /></button>
          </header>
          {colorStyles.map((style) => (
            <div className="library-row" key={style.id}>
              <input className="library-swatch" type="color" aria-label={`Стиль ${style.name}`} value={style.color} onChange={(event) => updateStyle(style.id, { color: event.target.value })} />
              <input className="library-name-input" defaultValue={style.name} key={`${style.id}-${style.name}`} onBlur={(event) => updateStyle(style.id, { name: event.target.value })} />
              <button className="library-apply" disabled={!selectedNode || !('fill' in selectedNode)} onClick={() => selectedId && applyStyle(selectedId, style.id)}>→</button>
              <button className="library-delete" title="Удалить стиль" onClick={() => deleteStyle(style.id)}><Trash2 size={11} /></button>
            </div>
          ))}
        </section>

        <section className="library-section">
          <header>
            <span><Type size={13} /> Текстовые стили</span>
            <button title="Создать текстовый стиль" onClick={() => createStyle(selectedId, 'text')}><Plus size={13} /></button>
          </header>
          {textStyles.map((style) => (
            <div className="library-row" key={style.id}>
              <span className="library-token" style={{ fontSize: Math.min(18, style.fontSize), fontWeight: style.fontWeight }}>Aa</span>
              <input
                className="library-number" aria-label={`Размер стиля ${style.name}`} type="number" defaultValue={style.fontSize}
                key={`${style.id}-${style.fontSize}`} onBlur={(event) => updateStyle(style.id, { fontSize: Number(event.target.value) })}
                onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              />
              <input className="library-name-input" defaultValue={style.name} key={`${style.id}-${style.name}`} onBlur={(event) => updateStyle(style.id, { name: event.target.value })} />
              <button className="library-apply" disabled={selectedNode?.type !== 'text'} onClick={() => selectedId && applyStyle(selectedId, style.id)}>→</button>
              <button className="library-delete" title="Удалить стиль" onClick={() => deleteStyle(style.id)}><Trash2 size={11} /></button>
            </div>
          ))}
        </section>

        <section className="library-section">
          <header>
            <span><Braces size={13} /> Переменные</span>
            <span className="library-header-actions">
              <button title="Добавить цветовую переменную" onClick={() => createVariable('color')}><Plus size={13} />C</button>
              <button title="Добавить числовую переменную" onClick={() => createVariable('number')}><Plus size={13} />N</button>
              <button title="Создать коллекцию" onClick={() => createVariableCollection()}><Plus size={13} />□</button>
            </span>
          </header>
          {(collections.length > 0 ? collections : [{ id: '', name: 'Variables', modes: [], activeModeId: '' }]).map((collection) => (
            <div className="variable-collection" key={collection.id || 'legacy'}>
              <div className="variable-collection-header">
                <span>{collection.name}</span>
                {collection.modes.length > 1 && (
                  <select aria-label={`Режим ${collection.name}`} value={collection.activeModeId} onChange={(event) => setVariableMode(collection.id, event.target.value)}>
                    {collection.modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.name}</option>)}
                  </select>
                )}
              </div>
              {variables.filter((variable) => (variable.collectionId ?? '') === collection.id).map(renderVariable)}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
