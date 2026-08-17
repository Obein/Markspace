import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { MnemonicService } from '../crypto/MnemonicService';
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
  const { cryptoService, apiClient, setVaultKey, activeVaultId, setActiveVaultId } = useApp();

  const [vaults, setVaults] = useState<VaultInfo[]>(() => {
    if (!username) return [];
    try {
      const stored = localStorage.getItem(`markspace_vaults_${username}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  });

  // Keep vaults persisted in localStorage
  useEffect(() => {
    if (username) {
      try {
        localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(vaults));
      } catch (_) {}
    }
  }, [vaults, username]);

  // Sync vaults from localStorage when user logs in
  useEffect(() => {
    if (!username) {
      setVaults([]);
      setActiveVaultId('');
      return;
    }
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
    setVaults([]);
    setActiveVaultId('');
  }, [username, setActiveVaultId]);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const handleCreateVault = useCallback(
    async (
      name: string,
      pin: string,
      customRecoveryKey?: string
    ): Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }> => {
      // 1. Pure standard UUID for Vault ID
      const vaultId = crypto.randomUUID();

      // 2. Request Server Ticket Key for multi-factor online envelope
      const { serverTicketKey } = await apiClient.getVaultTicketKey(vaultId);

      const salt = cryptoService.generateSalt();
      const vmk = await cryptoService.generateVMK();
      const recoveryKey = customRecoveryKey || MnemonicService.generateRecoveryKey(8);

      // 3. Multi-Factor Key Derivation (PIN/Recovery + Server Ticket Key)
      const pinKey = await cryptoService.deriveKeyFromPin(pin, salt, serverTicketKey);
      const recoveryKeyKey = await cryptoService.deriveKeyFromRecoveryKey(recoveryKey, salt, serverTicketKey);

      const wrappedVmkByPin = await cryptoService.wrapVMK(vmk, pinKey);
      const wrappedVmkByRecovery = await cryptoService.wrapVMK(vmk, recoveryKeyKey);

      const newVault: VaultInfo = {
        id: vaultId,
        name: name.trim() || t('untitledNote'),
        salt,
        wrappedVmkByPin,
        wrappedVmkByRecovery,
        createdAt: Date.now(),
      };

      setVaults((prev) => [...prev, newVault]);
      setActiveVaultId(newVault.id);
      // Note: Do not setVaultKey here immediately so user can view & backup the recovery key card
      showToast(t('createVault'), 'success');

      return { vault: newVault, recoveryKey, vmk };
    },
    [apiClient, cryptoService, setActiveVaultId, showToast, t]
  );

  const handleResetVaultPin = useCallback(
    async (vaultId: string, mnemonic: string, newPin: string): Promise<boolean> => {
      const targetVault = vaults.find((v) => v.id === vaultId);
      if (!targetVault || !targetVault.salt || !targetVault.wrappedVmkByRecovery) {
        throw new Error('Vault metadata is missing recovery key wrapping');
      }

      // Request Server Ticket Key
      const { serverTicketKey } = await apiClient.getVaultTicketKey(vaultId);

      const recoveryKeyKey = await cryptoService.deriveKeyFromRecoveryKey(
        mnemonic,
        targetVault.salt,
        serverTicketKey
      );
      const vmk = await cryptoService.unwrapVMK(targetVault.wrappedVmkByRecovery, recoveryKeyKey);

      const newPinKey = await cryptoService.deriveKeyFromPin(newPin, targetVault.salt, serverTicketKey);
      const newWrappedVmkByPin = await cryptoService.wrapVMK(vmk, newPinKey);

      await apiClient.reportVaultPinSuccess(vaultId);

      setVaults((prev) =>
        prev.map((v) => (v.id === vaultId ? { ...v, wrappedVmkByPin: newWrappedVmkByPin } : v))
      );
      setVaultKey(vaultId, vmk);
      showToast('PIN reset successfully', 'success');
      return true;
    },
    [vaults, apiClient, cryptoService, setVaultKey, showToast]
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
      const vaultToDelete = vaults.find((v) => v.id === vaultId);
      if (!vaultToDelete) return;

      if (onDeleteVaultNodes) {
        await onDeleteVaultNodes(vaultId);
      }

      const updatedVaults = vaults.filter((v) => v.id !== vaultId);
      setVaults(updatedVaults);

      const nextVaultId = updatedVaults.length > 0 ? (activeVaultId === vaultId ? updatedVaults[0].id : activeVaultId) : '';
      setActiveVaultId(nextVaultId);
      setVaultKey(vaultId, null);

      if (onVaultDeleted) {
        onVaultDeleted(vaultId, nextVaultId);
      }
      showToast(t('deleteVault'), 'success');
    },
    [vaults, activeVaultId, onDeleteVaultNodes, onVaultDeleted, setActiveVaultId, setVaultKey, showToast, t]
  );

  return {
    vaults,
    setVaults,
    activeVaultId,
    setActiveVaultId,
    activeVault,
    handleCreateVault,
    handleResetVaultPin,
    handleRenameVault,
    handleDeleteVault,
  };
}
