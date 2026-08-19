import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MnemonicService } from '../crypto/MnemonicService';
import { PasskeyCryptoService } from '../crypto/PasskeyCryptoService';
import { TranslationKey } from '../i18n/i18nContext';
import { VaultInfo } from '../interfaces/INoteModels';

interface UseVaultsOptions {
  username: string | null;
  t: (key: TranslationKey) => string;
  showToast: (msg: string, type?: 'error' | 'success' | 'info') => void;
  onDeleteVaultNodes?: (vaultId: string) => Promise<void>;
  onVaultDeleted?: (deletedVaultId: string, nextVaultId: string) => void;
}

function loadVaultsFromStorage(uname: string | null): VaultInfo[] {
  if (!uname) return [];
  try {
    const userSpecific = localStorage.getItem(`markspace_vaults_${uname}`);
    if (userSpecific !== null) {
      const parsed = JSON.parse(userSpecific);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_) {}
  return [];
}

export function useVaults({
  username,
  t,
  showToast,
  onDeleteVaultNodes,
  onVaultDeleted,
}: UseVaultsOptions) {
  const { cryptoService, apiClient, setVaultKey, activeVaultId, setActiveVaultId } = useApp();

  const [vaults, setVaults] = useState<VaultInfo[]>(() => loadVaultsFromStorage(username));
  const activeUserRef = useRef<string | null>(username);

  // Sync vaults from localStorage when username changes
  useEffect(() => {
    activeUserRef.current = username;
    if (!username) {
      setVaults([]);
      setActiveVaultId('');
      return;
    }
    const loaded = loadVaultsFromStorage(username);
    setVaults(loaded);
    if (loaded.length > 0) {
      setActiveVaultId((prevActive: string) => {
        if (!prevActive || !loaded.some((v) => v.id === prevActive)) {
          return loaded[0].id;
        }
        return prevActive;
      });
    } else {
      setActiveVaultId('');
    }
  }, [username, setActiveVaultId]);

  // Keep vaults persisted in localStorage ONLY when active user matches loaded data
  useEffect(() => {
    if (username && activeUserRef.current === username) {
      try {
        localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(vaults));
      } catch (_) {}
    }
  }, [vaults, username]);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const handleCreateVault = useCallback(
    async (
      name: string,
      customRecoveryKey?: string,
      providedPasskeyKey?: CryptoKey
    ): Promise<{ vault: VaultInfo; recoveryKey: string; vmk: CryptoKey }> => {
      // 1. Pure standard UUID for Vault ID
      const vaultId = crypto.randomUUID();

      const salt = cryptoService.generateSalt();
      const vmk = await cryptoService.generateVMK();
      const recoveryKey = customRecoveryKey
        ? MnemonicService.normalizeMnemonic(customRecoveryKey)
        : MnemonicService.generateRecoveryKey(8);

      // 2. Request Server OPRF evaluation for Recovery Key
      const recoveryBlindPoint = await cryptoService.computeOprfBlindPoint(recoveryKey, salt);
      const recoveryOprfRes = await apiClient.setupVaultOprf(vaultId, recoveryBlindPoint);

      // 3. Multi-Factor OPRF Key Derivation for Recovery Key
      const recoveryKeyKey = await cryptoService.deriveKeyFromRecoveryKey(
        recoveryKey,
        salt,
        recoveryOprfRes.evaluatedPoint
      );
      const wrappedVmkByRecovery = await cryptoService.wrapVMK(vmk, recoveryKeyKey);

      // 4. Passkey Key Wrapping (Mandatory & Hardware-bound)
      let pvk = providedPasskeyKey;

      if (!pvk) {
        if (!username) {
          throw new Error('User session is required to create a vault.');
        }
        if (!PasskeyCryptoService.isSupported()) {
          throw new Error('WebAuthn / Passkeys are not supported in this browser environment.');
        }
        if (!PasskeyCryptoService.hasPasskey(username)) {
          // If no passkey exists for this user, register one now
          await PasskeyCryptoService.registerPasskey(username);
        }
        const passkeyRes = await PasskeyCryptoService.authenticateAndDeriveKey(username, salt);
        pvk = passkeyRes.key;
      }

      if (!pvk) {
        throw new Error('Passkey verification failed. A valid Passkey is required to create and encrypt your vault.');
      }

      const wrappedVmkByPasskey = await cryptoService.wrapVMK(vmk, pvk);

      const newVault: VaultInfo = {
        id: vaultId,
        name: name.trim() || t('untitledNote'),
        salt,
        wrappedVmkByPasskey,
        wrappedVmkByRecovery,
        createdAt: Date.now(),
      };

      setVaults((prev) => {
        const next = [...prev, newVault];
        if (username) {
          try {
            localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(next));
          } catch (_) {}
        }
        return next;
      });

      if (!activeVaultId) {
        setActiveVaultId(newVault.id);
      }
      showToast(t('createVault'), 'success');

      return { vault: newVault, recoveryKey, vmk };
    },
    [activeVaultId, apiClient, cryptoService, setActiveVaultId, showToast, t, username]
  );

  const handleUnlockVaultWithPasskey = useCallback(
    async (vaultId: string): Promise<CryptoKey> => {
      const targetVault = vaults.find((v) => v.id === vaultId) || vaults[0];
      if (!targetVault || !targetVault.salt) {
        throw new Error('Vault metadata is missing or corrupted.');
      }
      if (!username) {
        throw new Error('User session not active.');
      }

      const { key: pvk } = await PasskeyCryptoService.authenticateAndDeriveKey(
        username,
        targetVault.salt
      );

      if (!targetVault.wrappedVmkByPasskey) {
        throw new Error('This vault is not bound to your Passkey. Please unlock with your 8-word Recovery Phrase.');
      }

      const vmk = await cryptoService.unwrapVMK(targetVault.wrappedVmkByPasskey, pvk);
      setVaultKey(vaultId, vmk);
      return vmk;
    },
    [vaults, username, cryptoService, setVaultKey]
  );

  const handleUnlockVaultWithRecovery = useCallback(
    async (vaultId: string, mnemonic: string): Promise<CryptoKey> => {
      const targetVault = vaults.find((v) => v.id === vaultId) || vaults[0];
      if (!targetVault || !targetVault.salt || !targetVault.wrappedVmkByRecovery) {
        throw new Error('Vault recovery metadata is missing.');
      }

      const normalizedMnemonic = MnemonicService.normalizeMnemonic(mnemonic);
      const recoveryBlindPoint = await cryptoService.computeOprfBlindPoint(normalizedMnemonic, targetVault.salt);
      const recoveryOprf = await apiClient.evaluateVaultOprf(vaultId, recoveryBlindPoint);

      const recoveryKeyKey = await cryptoService.deriveKeyFromRecoveryKey(
        normalizedMnemonic,
        targetVault.salt,
        recoveryOprf.evaluatedPoint
      );

      const vmk = await cryptoService.unwrapVMK(targetVault.wrappedVmkByRecovery, recoveryKeyKey);

      // Auto-bind Passkey if available and user is authenticated
      if (username && PasskeyCryptoService.isSupported()) {
        try {
          const { key: pvk } = await PasskeyCryptoService.authenticateAndDeriveKey(
            username,
            targetVault.salt
          );
          const wrappedVmkByPasskey = await cryptoService.wrapVMK(vmk, pvk);
          targetVault.wrappedVmkByPasskey = wrappedVmkByPasskey;
          setVaults((prev) => {
            const next = prev.map((v) => (v.id === vaultId ? { ...v, wrappedVmkByPasskey } : v));
            try {
              localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(next));
            } catch (_) {}
            return next;
          });
        } catch (_) {}
      }

      setVaultKey(vaultId, vmk);
      return vmk;
    },
    [vaults, cryptoService, apiClient, username, setVaultKey]
  );

  const handleResetVaultPin = useCallback(
    async (vaultId: string, mnemonic: string, newPin: string): Promise<boolean> => {
      const targetVault = vaults.find((v) => v.id === vaultId);
      if (!targetVault || !targetVault.salt || !targetVault.wrappedVmkByRecovery) {
        throw new Error('Vault metadata is missing recovery key wrapping');
      }

      const normalizedMnemonic = MnemonicService.normalizeMnemonic(mnemonic);
      // OPRF Evaluation for recovery key
      const recoveryBlindPoint = await cryptoService.computeOprfBlindPoint(normalizedMnemonic, targetVault.salt);
      const recoveryOprf = await apiClient.evaluateVaultOprf(vaultId, recoveryBlindPoint);

      const recoveryKeyKey = await cryptoService.deriveKeyFromRecoveryKey(
        normalizedMnemonic,
        targetVault.salt,
        recoveryOprf.evaluatedPoint
      );
      const vmk = await cryptoService.unwrapVMK(targetVault.wrappedVmkByRecovery, recoveryKeyKey);

      // Setup OPRF for new PIN (retained code for backward-compat)
      const newPinBlindPoint = await cryptoService.computeOprfBlindPoint(newPin, targetVault.salt);
      const newPinOprf = await apiClient.setupVaultOprf(vaultId, newPinBlindPoint);

      const newPinKey = await cryptoService.deriveKeyFromPin(
        newPin,
        targetVault.salt,
        newPinOprf.evaluatedPoint
      );
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

      if (username) {
        try {
          localStorage.setItem(`markspace_vaults_${username}`, JSON.stringify(updatedVaults));
          localStorage.removeItem(`markspace_lockout_${username}_${vaultId}`);
        } catch (_) {}
      }

      const nextVaultId = updatedVaults.length > 0 ? (activeVaultId === vaultId ? updatedVaults[0].id : activeVaultId) : '';
      setActiveVaultId(nextVaultId);
      setVaultKey(vaultId, null);

      if (onVaultDeleted) {
        onVaultDeleted(vaultId, nextVaultId);
      }
      showToast(t('deleteVault'), 'success');
    },
    [vaults, username, activeVaultId, onDeleteVaultNodes, onVaultDeleted, setActiveVaultId, setVaultKey, showToast, t]
  );

  return {
    vaults,
    setVaults,
    activeVaultId,
    setActiveVaultId,
    activeVault,
    handleCreateVault,
    handleUnlockVaultWithPasskey,
    handleUnlockVaultWithRecovery,
    handleResetVaultPin,
    handleRenameVault,
    handleDeleteVault,
  };
}
