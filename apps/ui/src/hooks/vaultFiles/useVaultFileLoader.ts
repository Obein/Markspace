import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';

export interface UseVaultFileLoaderOptions {
  activeVaultId: string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onInitialFilesLoaded?: (files: VaultFileItem[]) => void;
}

export interface UseVaultFileLoaderReturn {
  files: VaultFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  isLoadingVaultTree: boolean;
}

export function useVaultFileLoader({
  activeVaultId,
  showToast,
  onInitialFilesLoaded,
}: UseVaultFileLoaderOptions): UseVaultFileLoaderReturn {
  const {
    cryptoService,
    apiClient,
    cmk,
    isAuthenticated,
    isVaultUnlocked,
  } = useApp();
  const { t } = useI18n();

  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [isLoadingVaultTree, setIsLoadingVaultTree] = useState(false);

  // Load Vault File Tree and fetch Object Storage content when unlocked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    let isSubscribed = true;

    const fetchAndDecryptVaultTree = async () => {
      try {
        setIsLoadingVaultTree(true);
        const treeNodes = await apiClient.getVaultTree();
        const decryptedList: VaultFileItem[] = [];

        for (const node of treeNodes) {
          if (!isSubscribed) return;

          if (node.isDirectory) {
            decryptedList.push({
              id: node.id,
              name: node.name,
              filename: node.name,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType || 'inode/directory',
              size: 0,
              content: '',
              encryptedTitle: node.name,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
            continue;
          }

          if (node.size === 0) {
            const nodeFilename = node.path.split('/').pop() || node.name;
            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: 0,
              content: '',
              blobUrl: '',
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
            continue;
          }

          try {
            const { body, encryptedDek } = await apiClient.getVaultNodeContent(node.id);
            const dek = await cryptoService.unwrapDEK(encryptedDek || node.encryptedDek, cmk);

            let contentText = '';
            let blobUrl = '';

            if (body.byteLength === 0) {
              contentText = '';
            } else if (node.category === 'markdown') {
              const encryptedStr = new TextDecoder().decode(body);
              contentText = await cryptoService.decryptText(encryptedStr, dek);
            } else {
              const blob = new Blob([body], { type: node.mimeType });
              blobUrl = URL.createObjectURL(blob);
              contentText = blobUrl;
            }

            const nodeFilename = node.path.split('/').pop() || node.name;

            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: node.size,
              content: contentText,
              blobUrl,
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId || 'vault_default',
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
          } catch (err: any) {
            if (err?.message?.includes('404')) {
              console.warn(`Node ${node.id} content not found in storage, defaulting to empty note.`);
            } else {
              console.error(`Failed to decrypt file content for node ${node.id}`, err);
            }
            const nodeFilename = node.path.split('/').pop() || node.name;
            decryptedList.push({
              id: node.id,
              name: nodeFilename,
              filename: nodeFilename,
              path: node.path,
              category: node.category,
              mimeType: node.mimeType,
              size: node.size,
              content: '',
              blobUrl: '',
              encryptedTitle: nodeFilename,
              encryptedPayload: '',
              encryptedDek: node.encryptedDek,
              vaultId: activeVaultId,
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
            });
          }
        }

        if (isSubscribed) {
          setFiles(decryptedList);
          if (onInitialFilesLoaded) {
            onInitialFilesLoaded(decryptedList);
          }
        }
      } catch (err) {
        console.error('Failed to load Vault tree from backend', err);
        showToast(t('loadVaultFailed'), 'error');
      } finally {
        if (isSubscribed) {
          setIsLoadingVaultTree(false);
        }
      }
    };

    fetchAndDecryptVaultTree();

    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated, isVaultUnlocked, cmk, apiClient, cryptoService, activeVaultId, showToast, t]);

  // Reset active files in memory when unauthenticated or vault is locked
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) {
      setFiles([]);
    }
  }, [isAuthenticated, isVaultUnlocked, cmk]);

  return {
    files,
    setFiles,
    isLoadingVaultTree,
  };
}
