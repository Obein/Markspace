import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Check,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Calculator,
  ChevronDown,
  Columns,
  Rows,
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { useApp } from '../context/AppContext';
import {
  ParsedTableData,
  TableAlignment,
  serializeToMarkdownTable,
} from '../utils/TableConverter';

interface VisualTableEditorProps {
  initialData: ParsedTableData;
  onSave: (markdownTable: string) => void;
  onClose: () => void;
}

export const VisualTableEditor: React.FC<VisualTableEditorProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const { t } = useI18n();
  const { sheetEngine } = useApp();

  const [headers, setHeaders] = useState<string[]>(initialData.headers || ['Col 1', 'Col 2']);
  const [alignments, setAlignments] = useState<TableAlignment[]>(
    initialData.alignments || ['left', 'left']
  );
  const [rows, setRows] = useState<string[][]>(
    initialData.rows.length > 0 ? initialData.rows : [['', '']]
  );

  // Selected cell: { r: number (-1 for header), c: number }
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>({
    r: 0,
    c: 0,
  });

  const [isFormulaMenuOpen, setIsFormulaMenuOpen] = useState(false);
  const activeInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert column index to letter (0 -> A, 1 -> B, ...)
  const getColLetter = (index: number): string => {
    return String.fromCharCode(65 + (index % 26));
  };

  // Evaluate all formulas in the current grid for real-time live preview
  const evaluatedRows = useMemo(() => {
    try {
      // Build temporary markdown table to feed to SheetEvaluator
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

  // Focus active input when selected cell changes
  useEffect(() => {
    if (selectedCell) {
      setTimeout(() => {
        activeInputRef.current?.focus();
        activeInputRef.current?.select();
      }, 30);
    }
  }, [selectedCell?.r, selectedCell?.c]);

  // Update cell value
  const handleCellChange = (r: number, c: number, value: string) => {
    if (r === -1) {
      // Header row
      const nextHeaders = [...headers];
      nextHeaders[c] = value;
      setHeaders(nextHeaders);
    } else {
      // Data row
      const nextRows = rows.map((row, ri) => {
        if (ri !== r) return row;
        const nextRow = [...row];
        nextRow[c] = value;
        return nextRow;
      });
      setRows(nextRows);
    }
  };

  // Add Row
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

  // Delete Row
  const handleDeleteRow = (rowIndex: number) => {
    if (rows.length <= 1) return; // Keep at least 1 row
    const nextRows = rows.filter((_, ri) => ri !== rowIndex);
    setRows(nextRows);
    if (selectedCell && selectedCell.r >= nextRows.length) {
      setSelectedCell({ r: Math.max(0, nextRows.length - 1), c: selectedCell.c });
    }
  };

  // Add Column
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

  // Delete Column
  const handleDeleteColumn = (colIndex: number) => {
    if (headers.length <= 1) return; // Keep at least 1 column
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

  // Toggle Column Alignment
  const handleToggleAlignment = (colIndex: number, align: TableAlignment) => {
    const next = [...alignments];
    next[colIndex] = align;
    setAlignments(next);
  };

  // Insert Formula template into selected cell
  const handleInsertFormula = (formulaType: string) => {
    if (!selectedCell || selectedCell.r === -1) return;
    const colLetter = getColLetter(selectedCell.c);
    const lastRowIndex = selectedCell.r > 0 ? selectedCell.r : 1;
    const formulaStr = `=${formulaType}(${colLetter}1:${colLetter}${lastRowIndex})`;
    handleCellChange(selectedCell.r, selectedCell.c, formulaStr);
    setIsFormulaMenuOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Prev cell
        if (c > 0) {
          setSelectedCell({ r, c: c - 1 });
        } else if (r > -1) {
          setSelectedCell({ r: r - 1, c: headers.length - 1 });
        }
      } else {
        // Next cell
        if (c < headers.length - 1) {
          setSelectedCell({ r, c: c + 1 });
        } else if (r < rows.length - 1) {
          setSelectedCell({ r: r + 1, c: 0 });
        } else {
          // Add new row at bottom on last cell Tab
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

  // Save changes back to Markdown
  const handleFinish = () => {
    const markdown = serializeToMarkdownTable(headers, alignments, rows);
    onSave(markdown);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="flex flex-col w-full max-w-5xl max-h-[88vh] glass-panel rounded-glass-lg border border-white/20 shadow-2xl overflow-hidden bg-[#09090B]/90">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{t('visualTableEditor') || 'Visual Table Editor'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-editor-mono font-mono">
                  {headers.length} Cols × {rows.length} Rows
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Interactive spreadsheet editing with formulas, row/column operations & real-time preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>{t('cancel') || 'Cancel'}</span>
            </button>
            <button
              onClick={handleFinish}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-lg shadow-blue-500/25 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap text-xs">
          {/* Quick Structure Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddRow(selectedCell?.r)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition flex items-center gap-1.5"
              title="Add Row Below Selected"
            >
              <Rows className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Row</span>
            </button>

            <button
              onClick={() => handleAddColumn(selectedCell?.c)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition flex items-center gap-1.5"
              title="Add Column to the Right"
            >
              <Columns className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Column</span>
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Formula Helper Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFormulaMenuOpen(!isFormulaMenuOpen)}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition flex items-center gap-1.5 font-editor-mono font-mono"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>fx Formula</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isFormulaMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-30 w-44 glass-panel rounded-xl border border-white/15 shadow-2xl bg-[#121216] py-1 text-xs">
                  {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'].map((func) => (
                    <button
                      key={func}
                      onClick={() => handleInsertFormula(func)}
                      className="w-full px-3 py-1.5 text-left hover:bg-blue-600/20 text-zinc-200 hover:text-white flex items-center justify-between font-editor-mono font-mono"
                    >
                      <span className="font-semibold text-blue-400">={func}()</span>
                      <span className="text-[10px] text-zinc-500">{func.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Column Alignment Controls */}
          {selectedCell && (
            <div className="flex items-center gap-1 text-zinc-400">
              <span className="text-[11px] mr-1 font-mono">
                Col {getColLetter(selectedCell.c)} Align:
              </span>
              <button
                onClick={() => handleToggleAlignment(selectedCell.c, 'left')}
                className={`p-1 rounded ${
                  alignments[selectedCell.c] === 'left'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleToggleAlignment(selectedCell.c, 'center')}
                className={`p-1 rounded ${
                  alignments[selectedCell.c] === 'center'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleToggleAlignment(selectedCell.c, 'right')}
                className={`p-1 rounded ${
                  alignments[selectedCell.c] === 'right'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                onClick={() => handleDeleteColumn(selectedCell.c)}
                disabled={headers.length <= 1}
                className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition disabled:opacity-30"
                title="Delete Column"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <table className="border-collapse w-full min-w-[500px] text-xs font-editor-mono font-mono">
            <thead>
              {/* Alphabetical Column Header Bar (A, B, C...) */}
              <tr>
                <th className="w-10 p-1.5 bg-white/5 border border-white/10 text-center text-zinc-500 text-[10px] select-none">
                  #
                </th>
                {headers.map((_, ci) => (
                  <th
                    key={ci}
                    className={`p-1.5 border border-white/10 text-center select-none ${
                      selectedCell?.c === ci
                        ? 'bg-blue-600/20 text-blue-300 font-bold border-blue-500/40'
                        : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span>{getColLetter(ci)}</span>
                      <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                        <button
                          onClick={() => handleDeleteColumn(ci)}
                          disabled={headers.length <= 1}
                          className="hover:text-red-400 disabled:opacity-0 p-0.5"
                          title="Delete column"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="w-10 p-1 bg-transparent border-none">
                  <button
                    onClick={() => handleAddColumn()}
                    className="w-full py-1 rounded bg-white/5 hover:bg-white/10 text-blue-400 hover:text-white flex items-center justify-center transition"
                    title="Append column"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </th>
              </tr>

              {/* Table Headers Row */}
              <tr>
                <th className="w-10 p-2 bg-white/5 border border-white/10 text-center text-zinc-400 text-[10px] select-none font-bold">
                  H
                </th>
                {headers.map((h, ci) => {
                  const isSelected = selectedCell?.r === -1 && selectedCell?.c === ci;
                  return (
                    <th
                      key={ci}
                      onClick={() => setSelectedCell({ r: -1, c: ci })}
                      className={`p-0 border border-white/10 font-bold transition ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-500/10 z-10'
                          : 'bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <input
                        ref={isSelected ? activeInputRef : undefined}
                        type="text"
                        value={h}
                        onChange={(e) => handleCellChange(-1, ci, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, -1, ci)}
                        placeholder={`Header ${ci + 1}`}
                        className={`w-full p-2 bg-transparent text-white font-bold focus:outline-none placeholder-zinc-600 ${
                          alignments[ci] === 'center'
                            ? 'text-center'
                            : alignments[ci] === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      />
                    </th>
                  );
                })}
                <th className="w-10 p-0 bg-transparent border-none" />
              </tr>
            </thead>

            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="group">
                  {/* Row Number Column (1, 2, 3...) with hover delete */}
                  <td
                    className={`w-10 p-1.5 border border-white/10 text-center text-zinc-500 text-[10px] select-none relative ${
                      selectedCell?.r === ri ? 'bg-blue-600/20 text-blue-300 font-bold' : 'bg-white/5'
                    }`}
                  >
                    <span className="group-hover:hidden">{ri + 1}</span>
                    <button
                      onClick={() => handleDeleteRow(ri)}
                      disabled={rows.length <= 1}
                      className="hidden group-hover:flex items-center justify-center w-full text-red-400 hover:text-red-300 disabled:opacity-0"
                      title="Delete row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>

                  {/* Data Cells */}
                  {headers.map((_, ci) => {
                    const isSelected = selectedCell?.r === ri && selectedCell?.c === ci;
                    const rawValue = row[ci] || '';
                    const evalValue = evaluatedRows[ri]?.[ci] || rawValue;
                    const isFormula = rawValue.startsWith('=');

                    return (
                      <td
                        key={ci}
                        onClick={() => setSelectedCell({ r: ri, c: ci })}
                        className={`p-0 border border-white/10 transition relative ${
                          isSelected
                            ? 'ring-2 ring-blue-500 bg-blue-500/10 z-10'
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        {isSelected ? (
                          <input
                            ref={activeInputRef}
                            type="text"
                            value={rawValue}
                            onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                            className={`w-full p-2 bg-transparent text-white focus:outline-none ${
                              alignments[ci] === 'center'
                                ? 'text-center'
                                : alignments[ci] === 'right'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-full p-2 min-h-[34px] flex items-center cursor-pointer truncate ${
                              alignments[ci] === 'center'
                                ? 'justify-center text-center'
                                : alignments[ci] === 'right'
                                ? 'justify-end text-right'
                                : 'justify-start text-left'
                            } ${
                              isFormula
                                ? 'text-blue-300 font-semibold bg-blue-500/[0.04]'
                                : 'text-zinc-200'
                            }`}
                          >
                            <span>{evalValue || <span className="opacity-0">_</span>}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="w-10 p-0 bg-transparent border-none" />
                </tr>
              ))}

              {/* Bottom Append Row Button */}
              <tr>
                <td colSpan={headers.length + 2} className="pt-2">
                  <button
                    onClick={() => handleAddRow()}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/10 text-zinc-400 hover:text-blue-300 text-xs font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Append New Row</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
