import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { useApp } from '../../context/AppContext';
import { TableAlignment, serializeToMarkdownTable } from '../../utils/TableConverter';
import { VisualTableEditorProps, SelectedCellCoord } from './VisualTableEditor.types';
import { GridToolbar } from './GridToolbar';
import { SpreadsheetGrid } from './SpreadsheetGrid';

export const VisualTableEditor: React.FC<VisualTableEditorProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const { t } = useI18n();
  const { sheetEngine } = useApp();

  const [headers, setHeaders] = useState<string[]>(
    initialData?.headers && initialData.headers.length > 0
      ? initialData.headers
      : ['Header 1', 'Header 2']
  );
  const [alignments, setAlignments] = useState<TableAlignment[]>(
    initialData?.alignments && initialData.alignments.length > 0
      ? initialData.alignments
      : ['left', 'left']
  );
  const [rows, setRows] = useState<string[][]>(
    initialData?.rows && initialData.rows.length > 0 ? initialData.rows : [['', '']]
  );

  useEffect(() => {
    if (initialData?.headers && initialData.headers.length > 0) {
      setHeaders(initialData.headers);
    }
    if (initialData?.alignments && initialData.alignments.length > 0) {
      setAlignments(initialData.alignments);
    }
    if (initialData?.rows && initialData.rows.length > 0) {
      setRows(initialData.rows);
    }
  }, [initialData]);

  const [selectedCell, setSelectedCell] = useState<SelectedCellCoord | null>({
    r: 0,
    c: 0,
  });

  const activeInputRef = useRef<HTMLInputElement>(null);

  const getColLetter = (index: number): string => {
    return String.fromCharCode(65 + (index % 26));
  };

  const evaluatedRows = useMemo(() => {
    try {
      const tempMd = serializeToMarkdownTable(headers, alignments, rows);
      const evaluatedMd = sheetEngine.evaluateMarkdownFormulas(tempMd);
      const lines = evaluatedMd.split('\n').filter((l) => l.trim().startsWith('|'));
      if (lines.length > 2) {
        return lines.slice(2).map((l) =>
          l
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );
      }
    } catch (e) {
      console.warn('Formula evaluation error in VisualTableEditor', e);
    }
    return rows;
  }, [headers, alignments, rows, sheetEngine]);

  useEffect(() => {
    if (selectedCell) {
      setTimeout(() => {
        activeInputRef.current?.focus();
        activeInputRef.current?.select();
      }, 30);
    }
  }, [selectedCell?.r, selectedCell?.c]);

  const handleCellChange = (r: number, c: number, value: string) => {
    if (r === -1) {
      const nextHeaders = [...headers];
      nextHeaders[c] = value;
      setHeaders(nextHeaders);
    } else {
      const nextRows = rows.map((row, ri) => {
        if (ri !== r) return row;
        const nextRow = [...row];
        nextRow[c] = value;
        return nextRow;
      });
      setRows(nextRows);
    }
  };

  const handleAddRow = (atIndex?: number) => {
    const colCount = headers.length;
    const newRow = new Array(colCount).fill('');
    if (typeof atIndex === 'number' && atIndex >= 0) {
      const nextRows = [...rows];
      nextRows.splice(atIndex + 1, 0, newRow);
      setRows(nextRows);
      setSelectedCell({ r: atIndex + 1, c: selectedCell?.c ?? 0 });
    } else {
      setRows([...rows, newRow]);
      setSelectedCell({ r: rows.length, c: selectedCell?.c ?? 0 });
    }
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, ri) => ri !== rowIndex);
    setRows(nextRows);
    if (selectedCell && selectedCell.r >= nextRows.length) {
      setSelectedCell({ r: Math.max(0, nextRows.length - 1), c: selectedCell.c });
    }
  };

  const handleAddColumn = (atIndex?: number) => {
    const insertIdx = typeof atIndex === 'number' ? atIndex + 1 : headers.length;
    const nextHeaders = [...headers];
    nextHeaders.splice(insertIdx, 0, `Col ${nextHeaders.length + 1}`);

    const nextAlignments = [...alignments];
    nextAlignments.splice(insertIdx, 0, 'left');

    const nextRows = rows.map((row) => {
      const r = [...row];
      r.splice(insertIdx, 0, '');
      return r;
    });

    setHeaders(nextHeaders);
    setAlignments(nextAlignments);
    setRows(nextRows);
    setSelectedCell({ r: selectedCell?.r ?? 0, c: insertIdx });
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, ci) => ci !== colIndex);
    const nextAlignments = alignments.filter((_, ci) => ci !== colIndex);
    const nextRows = rows.map((row) => row.filter((_, ci) => ci !== colIndex));

    setHeaders(nextHeaders);
    setAlignments(nextAlignments);
    setRows(nextRows);
    if (selectedCell && selectedCell.c >= nextHeaders.length) {
      setSelectedCell({ r: selectedCell.r, c: Math.max(0, nextHeaders.length - 1) });
    }
  };

  const handleToggleAlignment = (colIndex: number, align: TableAlignment) => {
    const next = [...alignments];
    next[colIndex] = align;
    setAlignments(next);
  };

  const handleInsertFormula = (formulaType: string) => {
    if (!selectedCell || selectedCell.r === -1) return;
    const colLetter = getColLetter(selectedCell.c);
    const lastRowIndex = selectedCell.r > 0 ? selectedCell.r : 1;
    const formulaStr = `=${formulaType}(${colLetter}1:${colLetter}${lastRowIndex})`;
    handleCellChange(selectedCell.r, selectedCell.c, formulaStr);
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (c > 0) {
          setSelectedCell({ r, c: c - 1 });
        } else if (r > -1) {
          setSelectedCell({ r: r - 1, c: headers.length - 1 });
        }
      } else {
        if (c < headers.length - 1) {
          setSelectedCell({ r, c: c + 1 });
        } else if (r < rows.length - 1) {
          setSelectedCell({ r: r + 1, c: 0 });
        } else {
          handleAddRow();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (r > -1) setSelectedCell({ r: r - 1, c });
      } else {
        if (r < rows.length - 1) {
          setSelectedCell({ r: r + 1, c });
        } else {
          handleAddRow();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleFinish = () => {
    const markdown = serializeToMarkdownTable(headers, alignments, rows);
    onSave(markdown);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="flex flex-col w-full max-w-5xl max-h-[88vh] glass-panel rounded-glass-lg border border-white/20 shadow-2xl overflow-hidden bg-[#09090B]/90">
        {/* Top Header Bar — compact: cols×rows + cancel/confirm */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-white/5">
          <span className="text-sm font-mono font-medium text-zinc-300 select-none">
            {headers.length} Cols × {rows.length} Rows
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{t('cancel') || 'Cancel'}</span>
            </button>
            <button
              onClick={handleFinish}
              className="px-4 py-1.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-medium transition shadow-lg shadow-primaryColor-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <GridToolbar
          selectedCell={selectedCell}
          headers={headers}
          alignments={alignments}
          onAddRow={handleAddRow}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onToggleAlignment={handleToggleAlignment}
          onInsertFormula={handleInsertFormula}
          getColLetter={getColLetter}
        />

        {/* Spreadsheet Data Grid */}
        <SpreadsheetGrid
          headers={headers}
          alignments={alignments}
          rows={rows}
          evaluatedRows={evaluatedRows}
          selectedCell={selectedCell}
          activeInputRef={activeInputRef}
          onSelectCell={setSelectedCell}
          onCellChange={handleCellChange}
          onKeyDown={handleKeyDown}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          getColLetter={getColLetter}
        />

        {/* Status Bar */}
        <div className="px-6 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span>
              Cell:{' '}
              <strong className="text-white font-mono">
                {selectedCell
                  ? selectedCell.r === -1
                    ? `Header (${getColLetter(selectedCell.c)})`
                    : `${getColLetter(selectedCell.c)}${selectedCell.r + 1}`
                  : 'None'}
              </strong>
            </span>
            {selectedCell && selectedCell.r >= 0 && (
              <span className="text-zinc-500 font-mono">
                Value: {rows[selectedCell.r]?.[selectedCell.c] || '(empty)'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[10px]">
            <span>Tab: Next cell</span>
            <span>Enter: Next row</span>
            <span>Esc: Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
