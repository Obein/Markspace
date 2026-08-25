import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { TableAlignment } from '../../utils/TableConverter';
import { SelectedCellCoord } from './VisualTableEditor.types';

interface SpreadsheetGridProps {
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
  evaluatedRows: string[][];
  selectedCell: SelectedCellCoord | null;
  activeInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectCell: (cell: SelectedCellCoord | null) => void;
  onCellChange: (r: number, c: number, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, r: number, c: number) => void;
  onAddColumn: (atIndex?: number) => void;
  onDeleteColumn: (colIndex: number) => void;
  onAddRow: (atIndex?: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  getColLetter: (index: number) => string;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  headers,
  alignments,
  rows,
  evaluatedRows,
  selectedCell,
  activeInputRef,
  onSelectCell,
  onCellChange,
  onKeyDown,
  onAddColumn,
  onDeleteColumn,
  onAddRow,
  onDeleteRow,
  getColLetter,
}) => {
  return (
    <div
      className="flex-1 overflow-auto p-6 scrollbar-thin cursor-default"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectCell(null);
        }
      }}
    >
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
                    ? 'bg-primaryColor-600/20 text-primaryColor-300 font-bold border-primaryColor-500/40'
                    : 'bg-white/5 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <span>{getColLetter(ci)}</span>
                  <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                    <button
                      onClick={() => onDeleteColumn(ci)}
                      disabled={headers.length <= 1}
                      className="hover:text-red-400 disabled:opacity-0 p-0.5 cursor-pointer"
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
                onClick={() => onAddColumn()}
                className="w-full py-1 rounded bg-white/5 hover:bg-white/10 text-primaryColor-400 hover:text-white flex items-center justify-center transition cursor-pointer"
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
                  onClick={() => onSelectCell({ r: -1, c: ci })}
                  className={`p-0 border border-white/10 font-bold transition ${
                    isSelected
                      ? 'ring-2 ring-primaryColor-500 bg-primaryColor-500/10 z-10'
                      : 'bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <input
                    ref={isSelected ? (activeInputRef as any) : undefined}
                    type="text"
                    value={h}
                    onChange={(e) => onCellChange(-1, ci, e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, -1, ci)}
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
                  selectedCell?.r === ri ? 'bg-primaryColor-600/20 text-primaryColor-300 font-bold' : 'bg-white/5'
                }`}
              >
                <span className="group-hover:hidden">{ri + 1}</span>
                <button
                  onClick={() => onDeleteRow(ri)}
                  disabled={rows.length <= 1}
                  className="hidden group-hover:flex items-center justify-center w-full text-red-400 hover:text-red-300 disabled:opacity-0 cursor-pointer"
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
                    onClick={() => onSelectCell({ r: ri, c: ci })}
                    className={`p-0 border border-white/10 transition relative ${
                      isSelected
                        ? 'ring-2 ring-primaryColor-500 bg-primaryColor-500/10 z-10'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {isSelected ? (
                      <input
                        ref={activeInputRef as any}
                        type="text"
                        value={rawValue}
                        onChange={(e) => onCellChange(ri, ci, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, ri, ci)}
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
                            ? 'text-primaryColor-300 font-semibold bg-primaryColor-500/[0.04]'
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
                onClick={() => onAddRow()}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/10 text-zinc-400 hover:text-primaryColor-300 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primaryColor-400" />
                <span>Append New Row</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
