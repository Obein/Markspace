import React from 'react';
import { Maximize2, Minimize2, FileText, Image as ImageIcon, Film, Music, File } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  category: string;
  wordCount: number;
  charCount: number;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  showFullWidthToggle: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  onTitleChange,
  category,
  wordCount,
  charCount,
  isFullWidth,
  onToggleFullWidth,
  showFullWidthToggle,
}) => {
  const { t } = useI18n();

  const getFileCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'image':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            <span>IMAGE</span>
          </span>
        );
      case 'video':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Film className="w-3 h-3" />
            <span>VIDEO</span>
          </span>
        );
      case 'audio':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>AUDIO</span>
          </span>
        );
      case 'binary':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <File className="w-3 h-3" />
            <span>FILE</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>NOTE</span>
          </span>
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Note..."
          className="flex-1 text-xl font-bold bg-transparent text-white placeholder-zinc-500 focus:outline-none truncate tracking-tight"
        />
        {getFileCategoryBadge(category)}
      </div>

      {showFullWidthToggle && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span>
              {wordCount} {t('words')}
            </span>
            <span>
              {charCount} {t('chars')}
            </span>
          </div>

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
