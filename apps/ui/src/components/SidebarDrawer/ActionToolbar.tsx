import React, { useRef } from 'react';
import { Plus, FolderPlus, Upload, Check, X, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';

interface ActionToolbarProps {
  /** Whether a note creation is in-flight */
  isCreatingNote?: boolean;
  /** Whether a folder creation is in-flight */
  isCreatingFolderLoading?: boolean;
  /** Whether file upload is in-flight */
  isUploadingFiles?: boolean;
  /** Controls visibility of the inline folder name input */
  isFolderInputOpen: boolean;
  /** Current value of the inline folder name input */
  newFolderName: string;
  /** Callbacks */
  onCreateNote: () => void;
  onCreateFolder: (name: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onFolderInputOpen: () => void;
  onFolderInputClose: () => void;
  onNewFolderNameChange: (name: string) => void;
}

/**
 * Action Utility Bar for the sidebar.
 * Renders the primary "New Note" button, the folder-creation icon button,
 * the file upload icon button, and the inline folder-name input form.
 */
export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  isCreatingNote,
  isCreatingFolderLoading,
  isUploadingFiles,
  isFolderInputOpen,
  newFolderName,
  onCreateNote,
  onCreateFolder,
  onAddFiles,
  onFolderInputOpen,
  onFolderInputClose,
  onNewFolderNameChange,
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      // Reset so the same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    onFolderInputClose();
  };

  return (
    <>
      {/* Hidden native file picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />

      {/* Primary action row: New Note | New Folder | Upload */}
      <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 shrink-0">
        <button
          onClick={onCreateNote}
          disabled={isCreatingNote}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-primaryColor-600 hover:bg-primaryColor-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-primaryColor-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingNote ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>{t('newNote')}</span>
        </button>

        <button
          onClick={onFolderInputOpen}
          disabled={isCreatingFolderLoading}
          className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition border border-black/10 dark:border-white/10 cursor-pointer disabled:opacity-50"
          title={t('createDirectory')}
        >
          {isCreatingFolderLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primaryColor-600 dark:text-primaryColor-400" />
          ) : (
            <FolderPlus className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingFiles}
          className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition border border-black/10 dark:border-white/10 cursor-pointer disabled:opacity-50"
          title={isUploadingFiles ? t('uploading') : t('addFileMedia')}
        >
          {isUploadingFiles ? (
            <Loader2 className="w-4 h-4 animate-spin text-primaryColor-600 dark:text-primaryColor-400" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Inline folder name input — shown when user clicks the folder button */}
      {isFolderInputOpen && (
        <form
          onSubmit={handleFolderSubmit}
          className="p-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            placeholder={t('createDirectory')}
            autoFocus
            className="flex-1 px-2.5 py-1 bg-white dark:bg-black/40 border border-black/15 dark:border-white/10 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-primaryColor-500"
          />
          <button
            type="submit"
            className="p-1 text-primaryColor-600 dark:text-primaryColor-400 hover:text-primaryColor-700 dark:hover:text-primaryColor-300 cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onFolderInputClose}
            className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}
    </>
  );
};
