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
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-white/10 select-none">
      <button
        onClick={() => onInsertFormatting('**', '**')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Bold (**text**)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('*', '*')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Italic (*text*)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('~~', '~~')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Strikethrough (~~text~~)"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <button
        onClick={() => onInsertFormatting('# ')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Heading 1 (#)"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('## ')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Heading 2 (##)"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('### ')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Heading 3 (###)"
      >
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <button
        onClick={() => onInsertFormatting('- ')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Bullet List (-)"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('> ')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Blockquote (>)"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('```\n', '\n```', true)}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Code Block (```)"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('[', '](url)')}
        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
        title="Link ([text](url))"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      {/* Visual Table Editor Action Button */}
      <button
        onClick={onOpenVisualTable}
        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
        title="Visual Markdown Table Editor"
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span>Table</span>
      </button>

      {/* LaTeX Math Formula Button */}
      <button
        onClick={() => onInsertFormatting('$$\n', '\n$$', true)}
        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
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
        className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 text-[11px] font-editor-mono font-mono cursor-pointer"
        title="Mermaid Diagram (```mermaid)"
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span>Mermaid</span>
      </button>
    </div>
  );
};
