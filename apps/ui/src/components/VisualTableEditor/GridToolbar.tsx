import React, { useState } from 'react';
import {
  Rows,
  Columns,
  Calculator,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from 'lucide-react';
import { TableAlignment } from '../../utils/TableConverter';
import { SelectedCellCoord } from './VisualTableEditor.types';

interface GridToolbarProps {
  selectedCell: SelectedCellCoord | null;
  headers: string[];
  alignments: TableAlignment[];
  onAddRow: (atIndex?: number) => void;
  onAddColumn: (atIndex?: number) => void;
  onDeleteColumn: (colIndex: number) => void;
  onToggleAlignment: (colIndex: number, align: TableAlignment) => void;
  onInsertFormula: (formulaType: string) => void;
  getColLetter: (index: number) => string;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
  selectedCell,
  headers,
  alignments,
  onAddRow,
  onAddColumn,
  onDeleteColumn,
  onToggleAlignment,
  onInsertFormula,
  getColLetter,
}) => {
  const [isFormulaMenuOpen, setIsFormulaMenuOpen] = useState(false);

  return (
    <div className="px-6 py-2.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap text-xs">
      {/* Quick Structure Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAddRow(selectedCell?.r)}
          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
          title="Add Row Below Selected"
        >
          <Rows className="w-3.5 h-3.5 text-blue-400" />
          <span>+ Row</span>
        </button>

        <button
          onClick={() => onAddColumn(selectedCell?.c)}
          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
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
            className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition flex items-center gap-1.5 font-editor-mono font-mono cursor-pointer"
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
                  onClick={() => {
                    onInsertFormula(func);
                    setIsFormulaMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600/20 text-zinc-200 hover:text-white flex items-center justify-between font-editor-mono font-mono cursor-pointer"
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
            onClick={() => onToggleAlignment(selectedCell.c, 'left')}
            className={`p-1 rounded cursor-pointer ${
              alignments[selectedCell.c] === 'left'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : 'hover:bg-white/10 hover:text-white'
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleAlignment(selectedCell.c, 'center')}
            className={`p-1 rounded cursor-pointer ${
              alignments[selectedCell.c] === 'center'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : 'hover:bg-white/10 hover:text-white'
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleAlignment(selectedCell.c, 'right')}
            className={`p-1 rounded cursor-pointer ${
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
            onClick={() => onDeleteColumn(selectedCell.c)}
            disabled={headers.length <= 1}
            className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition disabled:opacity-30 cursor-pointer"
            title="Delete Column"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
