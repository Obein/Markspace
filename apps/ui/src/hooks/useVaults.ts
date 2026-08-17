import { useState, useEffect, useCallback } from 'react';
import { TranslationKey } from '../i18n/i18nContext';
import { VaultInfo } from '../interfaces/INoteModels';

interface UseVaultsOptions {
  username: string | null;
  t: (key: TranslationKey) => string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onDeleteVaultNodes?: (vaultId: string) => Promise<void>;
  onVaultDeleted?: (deletedVaultId: string, nextVaultId: string) => void;
}

export function useVaults({
  username,
  t,
  showToast,
  onDeleteVaultNodes,
  onVaultDeleted,
}: UseVaultsOptions) {
  const [activeVaultId, setActiveVaultId] = useState<string>('vault_default');

  const [vaults, setVaults] = useState<VaultInfo[]>(() => {
    try {
      const stored = localStorage.getItem(`markspace_vaults_${username || 'default'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return [{ id: 'vault_default', name: t('mainVault'), createdAt: Date.now() }];
  });

  // Keep vaults persisted in localStorage
  useEffect(() => {
    if (username && vaults.length > 0) {
      try {
        localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(vaults));
      } catch (_) {}
    }
  }, [vaults, username]);

  // Sync vaults from localStorage when user logs in
  useEffect(() => {
    if (username) {
      try {
        const stored = localStorage.getItem(`markspace_vaults_${username}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVaults(parsed);
            setActiveVaultId(parsed[0].id);
            return;
          }
        }
      } catch (_) {}
      setVaults([{ id: 'vault_default', name: t('mainVault'), createdAt: Date.now() }]);
      setActiveVaultId('vault_default');
    }
  }, [username, t]);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const handleCreateVault = useCallback(
    (name: string) => {
      const newVault: VaultInfo = {
        id: `vault_${crypto.randomUUID()}`,
        name,
        createdAt: Date.now(),
      };
      setVaults((prev) => [...prev, newVault]);
      setActiveVaultId(newVault.id);
      showToast(t('createVault'), 'success');
    },
    [showToast, t]
  );

  const handleRenameVault = useCallback(
    (vaultId: string, newName: string) => {
      if (!newName.trim()) return;
      setVaults((prev) =>
        prev.map((v) => (v.id === vaultId ? { ...v, name: newName.trim() } : v))
      );
      showToast(t('saved'), 'success');
    },
    [showToast, t]
  );

  const handleDeleteVault = useCallback(
    async (vaultId: string) => {
      if (vaults.length <= 1) return;

      const vaultToDelete = vaults.find((v) => v.id === vaultId);
      if (!vaultToDelete) return;

      if (onDeleteVaultNodes) {
        await onDeleteVaultNodes(vaultId);
      }

      const updatedVaults = vaults.filter((v) => v.id !== vaultId);
      setVaults(updatedVaults);

      const nextVaultId = activeVaultId === vaultId ? updatedVaults[0].id : activeVaultId;
      if (activeVaultId === vaultId) {
        setActiveVaultId(nextVaultId);
      }

      if (onVaultDeleted) {
        onVaultDeleted(vaultId, nextVaultId);
      }
      showToast(t('deleteVault'), 'success');
    },
    [vaults, activeVaultId, onDeleteVaultNodes, onVaultDeleted, showToast, t]
  );

  return {
    vaults,
    setVaults,
    activeVaultId,
    setActiveVaultId,
    activeVault,
    handleCreateVault,
    handleRenameVault,
    handleDeleteVault,
  };
}
