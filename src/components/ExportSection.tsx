import { useMemo, useState } from 'react';
import { ChevronDown, Download, LoaderCircle } from 'lucide-react';
import type { DesignDocument } from '../types';
import { getNode } from '../utils/document';
import { documentToSvg, exportPng, exportSvg } from '../utils/export';

interface ExportSectionProps {
  doc: DesignDocument;
  selection: string[];
}

export function ExportSection({ doc, selection }: ExportSectionProps) {
  const [scale, setScale] = useState(1);
  const [format, setFormat] = useState<'PNG' | 'SVG'>('PNG');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const selectedName = selection.length === 1
    ? getNode(doc, selection[0])?.name ?? 'Выделенный объект'
    : `${selection.length} объектов`;
  const preview = useMemo(
    () => previewOpen ? documentToSvg(doc, selection).svg : null,
    [doc, previewOpen, selection],
  );
  const previewUrl = preview ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview)}` : undefined;

  const runExport = async () => {
    setExporting(true);
    try {
      if (format === 'SVG') exportSvg(doc, selection, selectedName);
      else await exportPng(doc, selection, { scale, name: selectedName });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : `Не удалось экспортировать ${format}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="property-section export-properties">
      <div className="property-section-heading"><h3>Экспорт</h3></div>
      <div className="export-settings">
        <select aria-label="Масштаб экспорта" value={scale} disabled={format === 'SVG'} onChange={(event) => setScale(Number(event.target.value))}>
          {[1, 2, 3].map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
        <select aria-label="Формат экспорта" value={format} onChange={(event) => setFormat(event.target.value as 'PNG' | 'SVG')}>
          <option value="PNG">PNG</option>
          <option value="SVG">SVG</option>
        </select>
      </div>
      <button className="export-button object-export-button" disabled={exporting || selection.length === 0} onClick={() => void runExport()}>
        {exporting ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />}
        <span>Экспорт {selectedName}</span>
      </button>
      <button className="export-preview-toggle" aria-expanded={previewOpen} onClick={() => setPreviewOpen((open) => !open)}>
        <ChevronDown size={12} className={previewOpen ? '' : 'is-collapsed'} />
        <span>Предпросмотр</span>
      </button>
      {previewUrl && (
        <div className="export-preview">
          <img src={previewUrl} alt={`Предпросмотр: ${selectedName}`} draggable={false} />
        </div>
      )}
    </section>
  );
}
