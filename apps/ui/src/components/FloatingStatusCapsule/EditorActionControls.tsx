import React, { useState } from 'react';
import { History, Undo2, Redo2, Download, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface EditorActionControlsProps {
  onOpenHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onDownloadCurrentFile?: () => void;
  onDeleteCurrentFile?: () => void;
}

export const EditorActionControls: React.FC<EditorActionControlsProps> = ({
  onOpenHistory,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onDownloadCurrentFile,
  onDeleteCurrentFile,
}) => {
  const { t } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      {/* Version History Button */}
      {onOpenHistory && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <button
            onClick={onOpenHistory}
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={t('versionHistory')}
          >
            <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] font-medium whitespace-nowrap">{t('history')}</span>
          </button>
        </>
      )}

      {/* Undo / Redo Actions */}
      {(onUndo || onRedo) && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-25 disabled:pointer-events-none disabled:cursor-not-allowed"
                title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
              >
                <Undo2 className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-25 disabled:pointer-events-none disabled:cursor-not-allowed"
                title={canRedo ? 'Redo (Ctrl+Y / Ctrl+Shift+Z)' : 'Nothing to redo'}
              >
                <Redo2 className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            )}
          </div>
        </>
      )}

      {/* File Download Button */}
      {onDownloadCurrentFile && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          <button
            onClick={onDownloadCurrentFile}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Download Current File"
          >
            <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] font-medium whitespace-nowrap">{t('download')}</span>
          </button>
        </>
      )}

      {/* File Delete Button with Confirmation */}
      {onDeleteCurrentFile && (
        <>
          <div className="w-px h-4 bg-white/10 shrink-0" />
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-2.5 py-1 animate-in fade-in duration-100 shrink-0">
              <span className="text-[11px] text-red-300 font-medium whitespace-nowrap">
                {t('confirmDelete')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeleteCurrentFile();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-[10px] transition shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-1.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 border border-white/10 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              title={t('delete')}
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400 shrink-0" />
              <span className="text-[11px] font-medium whitespace-nowrap">{t('delete')}</span>
            </button>
          )}
        </>
      )}
    </>
  );
};
