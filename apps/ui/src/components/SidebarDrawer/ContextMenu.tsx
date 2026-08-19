import React from 'react';
import { Folder, Download, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContext';
import { ContextMenuState } from './SidebarDrawer.types';

interface ContextMenuProps {
  /** The current context menu state (position + target node info) */
  contextMenu: ContextMenuState;
  /** Node ID currently awaiting delete confirmation, or null */
  confirmDeleteNodeId: string | null;
  /** Node ID currently being deleted (shows spinner), or null */
  isDeletingNodeId?: string | null;
  /** Close the menu entirely (backdrop click or context-menu on backdrop) */
  onClose: () => void;
  /** Trigger file/folder download */
  onDownload?: (nodeId: string) => void;
  /**
   * Start rename for a node.
   * Receives the node ID and the initial name to pre-fill the inline input.
   */
  onRenameStart?: (nodeId: string, initialName: string) => void;
  /** Escalate to the confirmation card for this node */
  onDeleteRequest: (nodeId: string) => void;
  /** Execute the confirmed delete */
  onDeleteConfirm: (nodeId: string) => void;
  /** Dismiss the confirmation card without deleting */
  onDeleteCancel: () => void;
}

/**
 * Right-click / long-press context menu for file-tree nodes.
 *
 * Renders a fixed-position popover with:
 *  - Node name header
 *  - Download action
 *  - Rename action (optional, shown when `onRenameStart` is provided)
 *  - Delete action with an inline two-step confirmation card
 *
 * The component is only mounted when `contextMenu` is non-null;
 * callers should conditionally render: `{contextMenu && <ContextMenu ... />}`.
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  confirmDeleteNodeId,
  isDeletingNodeId,
  onClose,
  onDownload,
  onRenameStart,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  const { t } = useI18n();

  return (
    /* Full-screen backdrop — captures clicks outside the popover */
    <div
      className="fixed inset-0 z-50 select-none"
      onClick={() => {
        onClose();
        onDeleteCancel();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Popover card — positioned at the cursor/touch coordinates */}
      <div
        style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        className="fixed w-48 backdrop-blur-xl bg-white/95 dark:bg-[#09090B]/95 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Node name header */}
        <div className="px-3 py-1.5 border-b border-black/5 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold truncate flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400 shrink-0" />
          <span className="truncate">{contextMenu.nodeName}</span>
        </div>

        {/* ── Download ────────────────────────────────────────── */}
        <button
          onClick={() => {
            const targetId = contextMenu.nodeId;
            onClose();
            onDownload?.(targetId);
          }}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition my-0.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
          <span>{t('download')}</span>
        </button>

        {/* ── Rename (optional) ───────────────────────────────── */}
        {onRenameStart && (
          <button
            onClick={() => {
              const targetId = contextMenu.nodeId;
              const initialName =
                contextMenu.fileItem?.filename ?? contextMenu.nodeName;
              onClose();
              onDeleteCancel();
              onRenameStart(targetId, initialName);
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition my-0.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-primaryColor-600 dark:text-primaryColor-400" />
            <span>{t('rename')}</span>
          </button>
        )}

        {/* ── Delete — two-step confirmation ──────────────────── */}
        {confirmDeleteNodeId === contextMenu.nodeId ? (
          /* Step 2: confirmation card */
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1.5 my-1 animate-in fade-in duration-100">
            <p className="text-[11px] text-red-600 dark:text-red-300 font-medium">
              {t('confirmDelete')}
            </p>
            <div className="flex items-center gap-1.5 justify-end pt-0.5">
              <button
                onClick={() => {
                  const targetId = contextMenu.nodeId;
                  onClose();
                  onDeleteCancel();
                  onDeleteConfirm(targetId);
                }}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold transition shadow-sm cursor-pointer"
              >
                {t('confirm')}
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-2.5 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-[10px] transition cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: delete trigger button */
          <button
            onClick={() => onDeleteRequest(contextMenu.nodeId)}
            disabled={isDeletingNodeId === contextMenu.nodeId}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/15 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeletingNodeId === contextMenu.nodeId ? (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            )}
            <span>
              {isDeletingNodeId === contextMenu.nodeId
                ? t('deleting')
                : t('delete')}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
