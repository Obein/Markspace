import React, { useEffect, useState } from 'react';
import { X, History, RotateCcw, Loader2, Clock, FileText, Network } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { NodeVersionResponse } from '../../interfaces/IApiClient';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { ChunkSyncService } from '../../services/ChunkSyncService';
import { VersionHistoryModalProps } from './VersionHistoryModal.types';

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  file,
  onRevertSuccess,
}) => {
  const { apiClient, cmk } = useApp();
  const { t, language } = useI18n();

  const [versions, setVersions] = useState<NodeVersionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVersion, setSelectedVersion] = useState<NodeVersionResponse | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [revertingTimestamp, setRevertingTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      fetchHistory();
    } else {
      setVersions([]);
      setSelectedVersion(null);
      setPreviewContent('');
    }
  }, [isOpen, file]);

  const fetchHistory = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const manifestList = await apiClient.getManifestHistory(file.id);
      if (manifestList && manifestList.length > 0) {
        const formatted: NodeVersionResponse[] = manifestList.map((m: any) => ({
          id: m.id,
          nodeId: m.nodeId || m.node_id,
          userId: m.userId || m.user_id || '',
          timestamp: m.createdAt || m.created_at,
          commitHash: m.id,
          size: m.plainSize || m.plain_size || 0,
          encryptedDek: '',
          objectKey: `manifests/${m.id}`,
          commitMessage: m.commitMessage || m.commit_message || 'Snapshot',
          createdAt: m.createdAt || m.created_at,
        }));
        setVersions(formatted);
        handleSelectVersion(formatted[0]);
      } else {
        setVersions([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch version history');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVersion = async (version: NodeVersionResponse) => {
    setSelectedVersion(version);
    if (!file || !cmk) return;

    try {
      setLoadingPreview(true);
      const { contentText } = await ChunkSyncService.reconstructDocument(apiClient, version.commitHash, cmk);
      setPreviewContent(contentText);
    } catch (err) {
      console.error('Failed to reconstruct historical version payload', err);
      setPreviewContent('Failed to reconstruct historical content preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRevert = async (timestamp: number) => {
    if (!file || !cmk || revertingTimestamp) return;

    try {
      setRevertingTimestamp(timestamp);
      const syncResult = await ChunkSyncService.syncDocument(
        apiClient,
        file.id,
        file.path,
        previewContent,
        cmk,
        file.activeManifestId || undefined,
        `Revert to ${selectedVersion?.commitHash.substring(0, 8) || 'snapshot'}`
      );

      const revertedFileItem: VaultFileItem = {
        ...file,
        content: previewContent,
        activeManifestId: syncResult.manifest.manifestId,
        updatedAt: Date.now(),
      };

      onRevertSuccess(revertedFileItem, previewContent);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to revert file version', err);
      setError(err instanceof Error ? err.message : 'Failed to revert version');
    } finally {
      setRevertingTimestamp(null);
    }
  };

  if (!isOpen || !file) return null;

  const formatTimestamp = (ms: number): string => {
    return new Date(ms).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg cursor-pointer"
    >
      <div className="w-full max-w-4xl h-[80vh] p-6 glass-panel rounded-glass-lg border border-white/10 text-white shadow-2xl relative overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 cursor-default">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primaryColor-500/10 border border-primaryColor-500/20 text-primaryColor-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{t('versionHistory')}</span>
                <span className="text-xs font-mono text-zinc-400 font-normal">({file.filename})</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Merkle DAG Manifests & Version Tree</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content: Split View (Version Timeline List & Preview Panel) */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Left Column: Commit Timelines List */}
          <div className="w-80 border-r border-white/10 pr-4 flex flex-col overflow-y-auto shrink-0 space-y-2">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primaryColor-400" />
                <span>Loading version snapshots...</span>
              </div>
            ) : error ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                {error}
              </div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono space-y-2">
                <FileText className="w-6 h-6 opacity-30 mx-auto" />
                <p>{t('noHistory')}</p>
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.timestamp === ver.timestamp;
                const isReverting = revertingTimestamp === ver.timestamp;

                return (
                  <div
                    key={ver.id}
                    onClick={() => handleSelectVersion(ver)}
                    className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-primaryColor-600/20 border-primaryColor-500/50 text-white'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200 truncate flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primaryColor-400 shrink-0" />
                        <span>{formatTimestamp(ver.timestamp)}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                      <span className="flex items-center gap-1 text-primaryColor-300 bg-primaryColor-500/10 px-1.5 py-0.5 rounded border border-primaryColor-500/20">
                        <Network className="w-3 h-3 text-primaryColor-400" />
                        <span>{ver.commitHash.substring(0, 8)}</span>
                      </span>
                      <span className="text-zinc-500 truncate max-w-[120px]">{ver.commitMessage || 'Snapshot'}</span>
                    </div>

                    {isSelected && (
                      <div className="pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevert(ver.timestamp);
                          }}
                          disabled={isReverting}
                          className="w-full py-1.5 px-3 rounded-lg bg-primaryColor-600 hover:bg-primaryColor-500 text-white text-xs font-medium font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          {isReverting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>{isReverting ? t('reverting') : t('revert')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Historical Content Preview Box */}
          <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden min-h-0">
            <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primaryColor-400" />
                <span>Version Preview</span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
              {loadingPreview ? (
                <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primaryColor-400" />
                  <span>Decrypting historical version content...</span>
                </div>
              ) : previewContent ? (
                previewContent
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  Select a version commit from the timeline to preview content.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
