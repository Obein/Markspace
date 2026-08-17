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
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
            <ImageIcon className="w-3 h-3" />
            <span>IMAGE</span>
          </span>
        );
      case 'video':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0">
            <Film className="w-3 h-3" />
            <span>VIDEO</span>
          </span>
        );
      case 'audio':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1 shrink-0">
            <Music className="w-3 h-3" />
            <span>AUDIO</span>
          </span>
        );
      case 'binary':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
            <File className="w-3 h-3" />
            <span>FILE</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Hot-zone container for editing file name: clicking anywhere focuses & selects base filename */}
      <div
        onClick={handleContainerClick}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-text py-1 px-2 -mx-2 rounded-xl hover:bg-white/[0.04] transition group"
        title="Click to rename note"
      >
        <div className="flex items-baseline min-w-0 max-w-full flex-1">
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
            className="text-xl font-bold bg-transparent text-white placeholder-zinc-500 focus:outline-none tracking-tight shrink min-w-[60px]"
            style={{
              width: `${Math.max(baseName.length, 1) + 2}ch`,
              maxWidth: 'calc(100% - 4rem)',
            }}
          />
          {extension && (
            <span className="text-xl font-bold font-mono text-zinc-400 opacity-40 select-none shrink-0 tracking-tight ml-0.5">
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
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            title={isFullWidth ? 'Standard Width' : 'Full Width'}
          >
            {isFullWidth ? (
              <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
