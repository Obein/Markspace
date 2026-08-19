import React, { useEffect, useState } from 'react';
import { History, RotateCcw, Loader2, Clock, FileText, Network } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { NodeVersionResponse } from '../../interfaces/IApiClient';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { ChunkSyncService } from '../../services/ChunkSyncService';
import { VersionHistoryModalProps } from './VersionHistoryModal.types';
import { Modal, Button, Badge } from '../common';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      className="h-[80vh]"
      icon={<History className="w-5 h-5" />}
      title={
        <div className="flex items-center gap-2">
          <span>{t('versionHistory')}</span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-normal">({file.filename})</span>
        </div>
      }
      subtitle="Merkle DAG Manifests & Version Tree"
    >
      {/* Modal Content: Split View (Version Timeline List & Preview Panel) */}
      <div className="flex-1 flex gap-4 overflow-hidden h-full min-h-0">
        {/* Left Column: Commit Timelines List */}
        <div className="w-80 border-r border-black/10 dark:border-white/10 pr-4 flex flex-col overflow-y-auto shrink-0 space-y-2">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primaryColor-500" />
              <span>Loading version snapshots...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-xs rounded-xl">
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
                      ? 'bg-primaryColor-500/15 dark:bg-primaryColor-600/20 border-primaryColor-500/50 text-zinc-900 dark:text-white font-medium'
                      : 'bg-black/[0.02] dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border-black/5 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold truncate flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primaryColor-600 dark:text-primaryColor-400 shrink-0" />
                      <span>{formatTimestamp(ver.timestamp)}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <Badge variant="primary" size="xs" icon={<Network className="w-3 h-3" />}>
                      {ver.commitHash.substring(0, 8)}
                    </Badge>
                    <span className="text-zinc-500 truncate max-w-[120px]">{ver.commitMessage || 'Snapshot'}</span>
                  </div>

                  {isSelected && (
                    <div className="pt-2">
                      <Button
                        size="xs"
                        variant="primary"
                        fullWidth
                        loading={isReverting}
                        loadingText={t('reverting') || 'Reverting...'}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevert(ver.timestamp);
                        }}
                      >
                        {t('revert')}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Historical Content Preview Box */}
        <div className="flex-1 flex flex-col bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden min-h-0 shadow-xs">
          <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/5 border-b border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primaryColor-600 dark:text-primaryColor-400" />
              <span>Version Preview</span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-zinc-900 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
            {loadingPreview ? (
              <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primaryColor-500" />
                <span>Decrypting historical version content...</span>
              </div>
            ) : previewContent ? (
              previewContent
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                Select a version commit from the timeline to preview content.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

