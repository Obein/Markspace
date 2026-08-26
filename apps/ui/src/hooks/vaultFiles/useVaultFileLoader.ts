import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/i18nContext';
import { VaultFileItem } from '../../interfaces/INoteModels';
import { ChunkSyncService } from '../../services/ChunkSyncService';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';

export interface UseVaultFileLoaderOptions {
  activeVaultId: string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onInitialFilesLoaded?: (files: VaultFileItem[]) => void;
}

export interface UseVaultFileLoaderReturn {
  files: VaultFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<VaultFileItem[]>>;
  isLoadingVaultTree: boolean;
  loadFileContent: (file: VaultFileItem) => Promise<string>;
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

  /**
   * On-demand single file plaintext reconstructor / decryptor.
   * Ensures unopened files never have plaintexts loaded in memory.
   */
  const loadFileContent = async (file: VaultFileItem): Promise<string> => {
    if (file.isLoaded && file.content) {
      return file.content;
    }
    if (file.mimeType === 'inode/directory' || file.size === 0) {
      return '';
    }
    if (!cmk) return '';

    try {
      let contentText = '';
      let blobUrl = '';

      if (file.category === 'markdown' && file.activeManifestId) {
        try {
          const { contentText: docContent } = await ChunkSyncService.reconstructDocument(
            apiClient,
            file.activeManifestId,
            cmk
          );
          contentText = docContent;
        } catch (casErr) {
          console.warn(`Failed to reconstruct node ${file.id} from manifest, falling back to legacy blob:`, casErr);
          const { body, encryptedDek } = await apiClient.getVaultNodeContent(file.id);
          const dek = await cryptoService.unwrapDEK(encryptedDek || file.encryptedDek, cmk);
          contentText = await cryptoService.decryptText(body, dek);
        }
      } else {
        const { body, encryptedDek } = await apiClient.getVaultNodeContent(file.id);
        if (body.byteLength === 0) {
          contentText = '';
        } else if (file.category === 'markdown') {
          const dek = await cryptoService.unwrapDEK(encryptedDek || file.encryptedDek, cmk);
          contentText = await cryptoService.decryptText(body, dek);
        } else {
          const blob = new Blob([body], { type: file.mimeType });
          blobUrl = URL.createObjectURL(blob);
          contentText = blobUrl;
        }
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, content: contentText, blobUrl, isLoaded: true }
            : f
        )
      );

      return contentText;
    } catch (err) {
      console.error(`Failed to decrypt file content for node ${file.id}`, err);
      showToast(t('loadVaultFailed'), 'error');
      return '';
    }
  };

  // Load Vault File Tree (Metadata-Only: Zero Plaintext in RAM)
  useEffect(() => {
    if (!isAuthenticated || !isVaultUnlocked || !cmk) return;

    let isSubscribed = true;

    const fetchVaultTreeMetadata = async () => {
      try {
        setIsLoadingVaultTree(true);
        const treeNodes = await apiClient.getVaultTree();
        const metadataList: VaultFileItem[] = [];

        for (const node of treeNodes) {
          if (!isSubscribed) return;

          if (node.isDirectory) {
            metadataList.push({
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
              isLoaded: true,
            });
            continue;
          }

          const nodeFilename = node.path.split('/').pop() || node.name;
          const resolvedCategory = FileTreeBuilder.detectCategory(nodeFilename, node.mimeType);
          const resolvedMime = FileTreeBuilder.detectMimeType(nodeFilename, node.mimeType);

          metadataList.push({
            id: node.id,
            name: nodeFilename,
            filename: nodeFilename,
            path: node.path,
            category: resolvedCategory,
            mimeType: resolvedMime,
            size: node.size || 0,
            content: '', // Lazy: plaintexts are NOT loaded in memory
            blobUrl: '',
            encryptedTitle: nodeFilename,
            encryptedPayload: '',
            encryptedDek: node.encryptedDek,
            activeManifestId: node.activeManifestId,
            vaultId: activeVaultId || 'vault_default',
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            isLoaded: false,
          });
        }

        if (isSubscribed) {
          setFiles(metadataList);
          if (onInitialFilesLoaded) {
            onInitialFilesLoaded(metadataList);
          }
        }
      } catch (err) {
        console.error('Failed to load Vault tree from backend', err);
      } finally {
        if (isSubscribed) {
          setIsLoadingVaultTree(false);
        }
      }
    };

    fetchVaultTreeMetadata();

    return () => {
      isSubscribed = false;
    };
  }, [activeVaultId, apiClient, cmk, isAuthenticated, isVaultUnlocked]);

  return {
    files,
    setFiles,
    isLoadingVaultTree,
    loadFileContent,
  };
}
