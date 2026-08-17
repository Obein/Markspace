import React, { useRef } from 'react';
import { Maximize2, Minimize2, Image as ImageIcon, Film, Music, File } from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  category: string;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  showFullWidthToggle: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  onTitleChange,
  category,
  isFullWidth,
  onToggleFullWidth,
  showFullWidthToggle,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract base filename and extension (including the dot)
  const lastDotIndex = title.lastIndexOf('.');
  const hasExt = lastDotIndex > 0;
  const baseName = hasExt ? title.substring(0, lastDotIndex) : title;
  const extension = hasExt ? title.substring(lastDotIndex) : '';

  const handleBaseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBase = e.target.value;
    onTitleChange(newBase + extension);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const getFileCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'image':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0 self-center">
            <ImageIcon className="w-3 h-3" />
            <span>IMAGE</span>
          </span>
        );
      case 'video':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0 self-center">
            <Film className="w-3 h-3" />
            <span>VIDEO</span>
          </span>
        );
      case 'audio':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30 flex items-center gap-1 shrink-0 self-center">
            <Music className="w-3 h-3" />
            <span>AUDIO</span>
          </span>
        );
      case 'binary':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 self-center">
            <File className="w-3 h-3" />
            <span>FILE</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 min-h-[32px]">
      {/* Hot-zone container for editing file name */}
      <div
        onClick={handleContainerClick}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-text py-0.5"
        title="Click to rename note"
      >
        <div className="inline-flex items-baseline min-w-0 max-w-full">
          <div className="relative inline-flex items-baseline max-w-full">
            {/* Invisible sizer to make input width exactly match the typed text */}
            <span
              aria-hidden="true"
              className="text-xl font-bold tracking-tight invisible whitespace-pre pointer-events-none select-none leading-7"
            >
              {baseName || 'Untitled Note'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={baseName}
              onChange={handleBaseNameChange}
              onFocus={handleFocus}
              onClick={(e) => {
                e.currentTarget.select();
              }}
              placeholder="Untitled Note"
              className="absolute inset-0 w-full h-full text-xl font-bold bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none tracking-tight p-0 m-0 border-none leading-7"
            />
          </div>
          {extension && (
            <span className="text-xl font-bold text-zinc-500 dark:text-zinc-300 opacity-80 select-none shrink-0 tracking-tight leading-7">
              {extension}
            </span>
          )}
        </div>
        {getFileCategoryBadge(category)}
      </div>

      {showFullWidthToggle && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleFullWidth}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center"
            title={isFullWidth ? 'Standard Width' : 'Full Width'}
          >
            {isFullWidth ? (
              <Minimize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
