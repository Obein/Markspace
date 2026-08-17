import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code,
  Table as TableIcon,
  Link as LinkIcon,
  Sigma,
  GitBranch,
} from 'lucide-react';

interface FormattingToolbarProps {
  onInsertFormatting: (prefix: string, suffix?: string, block?: boolean) => void;
  onOpenVisualTable: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  onInsertFormatting,
  onOpenVisualTable,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1.5 pb-0 border-t border-black/5 dark:border-white/10 select-none min-h-[30px]">
      <button
        onClick={() => onInsertFormatting('**', '**')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Bold (**text**)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('*', '*')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Italic (*text*)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('~~', '~~')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Strikethrough (~~text~~)"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1 shrink-0 self-center" />

      <button
        onClick={() => onInsertFormatting('# ')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Heading 1 (#)"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('## ')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Heading 2 (##)"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('### ')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Heading 3 (###)"
      >
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1 shrink-0 self-center" />

      <button
        onClick={() => onInsertFormatting('- ')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Bullet List (-)"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('> ')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Blockquote (>)"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('```\n', '\n```', true)}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Code Block (```)"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('[', '](url)')}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Link ([text](url))"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1 shrink-0 self-center" />

      {/* Visual Table Editor Action Button */}
      <button
        onClick={onOpenVisualTable}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center justify-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
        title="Visual Markdown Table Editor"
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span>Table</span>
      </button>

      {/* LaTeX Math Formula Button */}
      <button
        onClick={() => onInsertFormatting('$$\n', '\n$$', true)}
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center justify-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
        title="LaTeX Formula ($$...$$)"
      >
        <Sigma className="w-3.5 h-3.5" />
        <span>LaTeX</span>
      </button>

      {/* Mermaid Diagram Code Generator */}
      <button
        onClick={() =>
          onInsertFormatting(
            '```mermaid\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[OK]\n  B -->|No| D[Cancel]\n',
            '\n```',
            true
          )
        }
        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition flex items-center justify-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
        title="Mermaid Diagram (```mermaid)"
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span>Mermaid</span>
      </button>
    </div>
  );
};
