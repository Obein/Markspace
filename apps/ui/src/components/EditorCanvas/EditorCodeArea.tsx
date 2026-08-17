import React, { useMemo } from 'react';
import { IHighlightService } from '../../interfaces/IHighlightService';

interface EditorCodeAreaProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
  onSelectionChange: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  highlightService: IHighlightService;
  category: string;
  placeholder?: string;
}

export const EditorCodeArea: React.FC<EditorCodeAreaProps> = ({
  textareaRef,
  value,
  onChange,
  onSelectionChange,
  onKeyDown,
  highlightService,
  category,
  placeholder = 'Write your thoughts...',
}) => {
  // Generate real-time syntax highlighted HTML using Lezer parser
  const highlightedHtml = useMemo(() => {
    if (category !== 'markdown' && category !== 'md') {
      return '';
    }
    const html = highlightService.highlightCode(value, 'markdown');
    // Ensure trailing newline renders matching line break in pre
    return value.endsWith('\n') ? html + '\n ' : html || '';
  }, [value, category, highlightService]);

  return (
    <div className="flex-1 relative min-h-full">
      {/* Real-time Syntax Highlighted Backdrop */}
      <pre
        aria-hidden="true"
        className="absolute inset-0 px-4 m-0 p-0 border-0 bg-transparent text-zinc-100 dark:text-zinc-100 font-editor-mono font-mono text-[15px] leading-6 whitespace-pre-wrap break-words pointer-events-none select-none z-0 overflow-hidden syntax-backdrop"
        dangerouslySetInnerHTML={{
          __html: highlightedHtml,
        }}
      />

      {/* Interactive Textarea (Transparent text layer with synchronized caret & selection) */}
      <textarea
        ref={textareaRef as any}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelectionChange();
        }}
        onSelect={onSelectionChange}
        onKeyUp={onSelectionChange}
        onKeyDown={onKeyDown}
        onClick={onSelectionChange}
        onFocus={onSelectionChange}
        placeholder={placeholder}
        spellCheck={false}
        className="relative z-10 w-full h-full min-h-[500px] px-4 m-0 p-0 border-0 bg-transparent text-transparent placeholder-zinc-600 focus:outline-none resize-none font-editor-mono font-mono text-[15px] leading-6 editor-textarea whitespace-pre-wrap break-words selection:bg-blue-500/35 overflow-hidden scrollbar-none"
      />
    </div>
  );
};
